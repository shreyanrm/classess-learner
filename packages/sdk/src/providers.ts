import type { ConsentTier } from '@classess/contracts';

/**
 * The external-provider seams. Each has the same typed interface for its mock and live forms, so
 * going live is a provider binding + an env flag, never a refactor. Phase 0 runs the mock side.
 */

// --- LLM (via the gateway) ----------------------------------------------------------------------

export type CapabilityInput = Record<string, unknown>;

export interface LLMResult {
  capability: string;
  output: unknown;
  track: 'track_1' | 'track_2';
  cached: boolean;
}

/** Raised when a profiling capability is requested without the elevated consent tier. */
export class ConsentDeniedError extends Error {
  constructor(capability: string) {
    super(`capability ${capability} requires the elevated consent tier`);
    this.name = 'ConsentDeniedError';
  }
}

export interface LLMProvider {
  invoke(
    capability: string,
    input: CapabilityInput,
    ctx: { consentTier: ConsentTier },
  ): Promise<LLMResult>;
}

/** Capabilities that profile the learner — refused under un_elevated (DPDP). Mirrors the gateway. */
const ELEVATED_ONLY = new Set(['archetype.classify', 'peakcut.evaluate']);

function mockOutputFor(capability: string, _input: CapabilityInput): unknown {
  switch (capability) {
    case 'generate.opener':
      return {
        prompt: 'Find the value of x that makes 2x + 3 = 7 true.',
        interactive: true,
        verification_hash: 'seed-opener-linear-eq-1',
      };
    case 'vidya.turn':
      return {
        say: 'That is the topic we are on. Open it and we will pose the first step together.',
        actions: [
          { type: 'setMood', mood: 'thinking' },
          { type: 'highlight', targetId: 'concept-linear-eq', level: 'primary' },
          { type: 'annotate', targetId: 'concept-linear-eq', mark: 'lookHere', level: 'secondary' },
        ],
        grounded: true,
        handed_answer: false,
      };
    case 'grade.attempt':
      return { correct: true, rationale: 'mock grade' };
    case 'verify.math':
      return { verified: true, confidence: 1 };
    default:
      return { note: `mock ${capability}` };
  }
}

/** Deterministic, network-free LLM responses. Never contacts a provider. */
export class MockLLMProvider implements LLMProvider {
  async invoke(
    capability: string,
    input: CapabilityInput,
    ctx: { consentTier: ConsentTier },
  ): Promise<LLMResult> {
    if (ELEVATED_ONLY.has(capability) && ctx.consentTier !== 'elevated') {
      throw new ConsentDeniedError(capability);
    }
    return {
      capability,
      output: mockOutputFor(capability, input),
      track: 'track_2',
      cached: false,
    };
  }
}

/** The live LLM provider posts to the gateway service. Wired when LLM_MODE=live (Phase 1+). */
export class GatewayLLMProvider implements LLMProvider {
  constructor(private readonly gatewayUrl: string) {}

  async invoke(
    capability: string,
    input: CapabilityInput,
    ctx: { consentTier: ConsentTier },
  ): Promise<LLMResult> {
    const res = await fetch(`${this.gatewayUrl}/v1/capability/${capability}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ consent_tier: ctx.consentTier, payload: input }),
    });
    if (res.status === 403) throw new ConsentDeniedError(capability);
    if (!res.ok) throw new Error(`gateway ${capability} failed: ${res.status}`);
    const data = (await res.json()) as {
      capability: string;
      output: unknown;
      track: 'track_1' | 'track_2';
      cache_hit: boolean;
    };
    return {
      capability: data.capability,
      output: data.output,
      track: data.track,
      cached: data.cache_hit,
    };
  }
}

// --- Content (verified) -------------------------------------------------------------------------

export interface VerifiedItem {
  node_id: string;
  modality: string;
  verification_hash: string;
  body: unknown;
}

/** A practice item: a problem with a verifier-frozen correct answer (unaided evidence). */
export interface PracticeItem {
  id: string;
  node_id: string;
  equation: string;
  /** The verifier-established correct value of x (frozen at seed time). */
  answer: string;
  /** IRT-ish difficulty in [0, 1]. */
  difficulty: number;
}

export interface ContentProvider {
  getVerified(nodeId: string, modality: string): Promise<VerifiedItem | null>;
  getPracticeItems(nodeId: string): Promise<PracticeItem[]>;
}

const ATOM_LINEAR_EQ = '00000000-0000-7000-8000-00000000a003';

const ATOM_PRACTICE: PracticeItem[] = [
  {
    id: '00000000-0000-7000-8000-000000000101',
    node_id: ATOM_LINEAR_EQ,
    equation: 'x + 7 = 12',
    answer: '5',
    difficulty: 0.15,
  },
  {
    id: '00000000-0000-7000-8000-000000000102',
    node_id: ATOM_LINEAR_EQ,
    equation: '2x + 3 = 7',
    answer: '2',
    difficulty: 0.2,
  },
  {
    id: '00000000-0000-7000-8000-000000000103',
    node_id: ATOM_LINEAR_EQ,
    equation: '3x = 12',
    answer: '4',
    difficulty: 0.25,
  },
  {
    id: '00000000-0000-7000-8000-000000000104',
    node_id: ATOM_LINEAR_EQ,
    equation: '5x - 2 = 13',
    answer: '3',
    difficulty: 0.4,
  },
  {
    id: '00000000-0000-7000-8000-000000000105',
    node_id: ATOM_LINEAR_EQ,
    equation: 'x/2 = 5',
    answer: '10',
    difficulty: 0.5,
  },
  {
    id: '00000000-0000-7000-8000-000000000106',
    node_id: ATOM_LINEAR_EQ,
    equation: '2(x + 3) = 10',
    answer: '2',
    difficulty: 0.6,
  },
];

/** Serves the seeded, verifier-passed content for the atom (the tier-1 warm path). */
export class SeedContentProvider implements ContentProvider {
  private readonly seed = new Map<string, VerifiedItem>([
    [
      '00000000-0000-7000-8000-00000000a003:opener',
      {
        node_id: '00000000-0000-7000-8000-00000000a003',
        modality: 'opener',
        verification_hash: 'seed-opener-linear-eq-1',
        body: {
          prompt: 'Find the value of x that makes this equation true. Show each step.',
          equation: '2x + 3 = 7',
          interactive: true,
        },
      },
    ],
  ]);

  async getVerified(nodeId: string, modality: string): Promise<VerifiedItem | null> {
    return this.seed.get(`${nodeId}:${modality}`) ?? null;
  }

  async getPracticeItems(nodeId: string): Promise<PracticeItem[]> {
    return ATOM_PRACTICE.filter((item) => item.node_id === nodeId);
  }
}

// --- Messaging (parent) -------------------------------------------------------------------------

export interface MessagingProvider {
  sendParentDigest(msg: {
    to: string;
    artifact: unknown;
  }): Promise<{ delivered: boolean; mode: string }>;
}

/** Renders a digest preview; never sends (WhatsApp goes live Phase 2-3). */
export class MockMessagingProvider implements MessagingProvider {
  async sendParentDigest(): Promise<{ delivered: boolean; mode: string }> {
    return { delivered: false, mode: 'preview' };
  }
}

// --- Payment ------------------------------------------------------------------------------------

export interface Subscription {
  plan: 'free' | 'superstar';
  status: 'none' | 'active' | 'cancelled';
}

export interface PaymentProvider {
  getSubscription(subjectId: string): Promise<Subscription>;
}

/** Mock subscription state (Razorpay/IAP go live Phase 4). */
export class MockPaymentProvider implements PaymentProvider {
  async getSubscription(): Promise<Subscription> {
    return { plan: 'free', status: 'none' };
  }
}
