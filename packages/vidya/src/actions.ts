import { z } from 'zod';
import type { VidyaMood } from './identity';

/**
 * Vidya's action vocabulary — the things she can DO on the page, not just say. Her reasoning returns
 * a list of these; the executor runs the in-context ones immediately and OFFERS the consequential
 * ones (the calm principle: power is available, never imposed). This is what makes her feel directly
 * connected to the app — she can point at, highlight, and mark up the very page the learner is on.
 */

export const HIGHLIGHT_LEVELS = ['primary', 'secondary', 'tertiary'] as const;
export type HighlightLevel = (typeof HIGHLIGHT_LEVELS)[number];

export const ANNOTATION_KINDS = [
  'underline',
  'circle',
  'arrow',
  'bracket',
  'check',
  'crossOut',
  'lookHere',
] as const;
export type AnnotationKind = (typeof ANNOTATION_KINDS)[number];

const MOODS = ['idle', 'thinking', 'listening', 'correct', 'celebrate', 'waiting', 'hint'] as const;

const level = z.enum(HIGHLIGHT_LEVELS).optional();
/** How long a mark lives before it fades, in ms. Vidya decides per mark; omitted = a sensible default. */
const ttl = z.number().int().positive().optional();

export const VidyaActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('say'), text: z.string() }),
  z.object({ type: z.literal('setMood'), mood: z.enum(MOODS) }),
  z.object({ type: z.literal('highlight'), targetId: z.string(), level, ttl }),
  z.object({
    type: z.literal('annotate'),
    targetId: z.string(),
    mark: z.enum(ANNOTATION_KINDS),
    level,
    ttl,
  }),
  // Vidya writes a handwritten note (Caveat) beside a target — typed on letter by letter.
  z.object({ type: z.literal('write'), targetId: z.string(), text: z.string(), level, ttl }),
  z.object({ type: z.literal('point'), targetId: z.string(), ttl }),
  // Demonstrate by doing — drive an interactive's own state through its applyTutorAction seam
  // (VIDYA.md §4 setState). Only targets that expose scene state accept it.
  z.object({
    type: z.literal('setState'),
    targetId: z.string(),
    patch: z.record(z.string(), z.unknown()),
  }),
  // Voice-locked speech (VIDYA.md §4 speak): plays through the voice path when live, otherwise
  // rendered as her handwritten line.
  z.object({ type: z.literal('speak'), text: z.string() }),
  // Learn a durable fact the learner just shared — a preferred name, a goal, an exam date. Persisted
  // to the mind and rendered into every future dossier (VIDYA.md §7). Never for transient chatter.
  z.object({ type: z.literal('remember'), text: z.string() }),
  // The data-rights twin of remember (VIDYA-CAPABILITIES.md family E, the forget verb): show, correct,
  // or delete what she remembers. scope 'show' reads the real dossier back; 'fact' drops what they name
  // (target); 'all' wipes the mind. Deleting is confirm-before-execute (capability ladder) — the app
  // purges from the real on-device mind and she reports exactly what was removed. Never a guess.
  z.object({
    type: z.literal('forget'),
    scope: z.enum(['show', 'fact', 'all']),
    target: z.string().optional(),
  }),
  z.object({ type: z.literal('revealHint'), level: z.number().int().nonnegative() }),
  z.object({ type: z.literal('escalateHint') }),
  // Re-ink the marks she last drew (VIDYA-CAPABILITIES.md family M): her ink is transient and fades by
  // ttl, so "that diagram you drew earlier" is gone from the screen. This redraws her last mark set
  // fresh — the bus keeps it — instead of asking the learner to re-describe what she already drew.
  z.object({ type: z.literal('redrawMarks') }),
  // Consequential — offered, never forced.
  z.object({ type: z.literal('navigate'), route: z.string(), reason: z.string().optional() }),
  z.object({ type: z.literal('startPractice'), nodeId: z.string(), reason: z.string().optional() }),
  z.object({ type: z.literal('switchModality'), to: z.string(), reason: z.string().optional() }),
]);

export type VidyaAction = z.infer<typeof VidyaActionSchema>;
export type ConsequentialAction = Extract<
  VidyaAction,
  { type: 'navigate' | 'startPractice' | 'switchModality' }
>;

const CONSEQUENTIAL = new Set(['navigate', 'startPractice', 'switchModality']);

export function isConsequential(action: VidyaAction): action is ConsequentialAction {
  return CONSEQUENTIAL.has(action.type);
}

const ANNOTATION_SET = new Set<string>(ANNOTATION_KINDS);

/**
 * Normalize a raw action before validation. The model sometimes shorthands a mark as its own
 * type — {"type":"circle","targetId":...} instead of {"type":"annotate","mark":"circle"} — because
 * the mark legend reads like a type list. Fold that shorthand back into a real annotate so her ink
 * still renders instead of being silently dropped.
 */
function normalizeAction(item: unknown): unknown {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const t = (item as { type?: unknown }).type;
    if (typeof t === 'string' && ANNOTATION_SET.has(t)) {
      const { type: _t, ...rest } = item as Record<string, unknown>;
      return { type: 'annotate', mark: t, ...rest };
    }
  }
  return item;
}

/** Validate a raw action list from Vidya's reasoning; silently drop anything malformed. */
export function parseActions(raw: unknown): VidyaAction[] {
  if (!Array.isArray(raw)) return [];
  const actions: VidyaAction[] = [];
  for (const item of raw) {
    const result = VidyaActionSchema.safeParse(normalizeAction(item));
    if (result.success) actions.push(result.data);
  }
  return actions;
}

// --- The pure reducer (so dispatch is testable without a DOM) -----------------------------------

export interface ActiveHighlight {
  targetId: string;
  level: HighlightLevel;
  /** Lifetime in ms before it fades; undefined = default. */
  ttl?: number;
}
export interface ActiveAnnotation {
  targetId: string;
  mark: AnnotationKind;
  level: HighlightLevel;
  ttl?: number;
}
/** A handwritten (Caveat) note Vidya writes beside a target, typed on letter by letter. */
export interface ActiveNote {
  targetId: string;
  text: string;
  level: HighlightLevel;
  ttl?: number;
}

/** A tutor-driven state patch aimed at a registered scene's applyTutorAction seam. */
export interface TutorStatePatch {
  targetId: string;
  patch: Record<string, unknown>;
}

/** A data-rights request (the forget action): show the dossier, or purge a fact / the whole mind. */
export interface ForgetEffect {
  scope: 'show' | 'fact' | 'all';
  target?: string;
}

export interface ActionEffects {
  highlights: ActiveHighlight[];
  annotations: ActiveAnnotation[];
  notes: ActiveNote[];
  mood: VidyaMood | null;
  offer: ConsequentialAction | null;
  says: string[];
  /** Voice-locked lines: spoken when voice is live, otherwise her handwritten line. */
  speaks: string[];
  /** Durable facts she learned this turn — persisted to the mind, fed into future dossiers. */
  remembers: string[];
  /** Data-rights requests this turn — the app renders the dossier or purges the mind, grounded. */
  forgets: ForgetEffect[];
  /** setState demonstrations, routed to each target's applyTutorAction seam. */
  setStates: TutorStatePatch[];
  revealHints: number[];
  escalateHints: number;
  /** She asked to re-ink her last mark set (family M) — the bus redraws what has since faded. */
  redrawMarks: boolean;
}

/** Fold a list of actions into the marks/mood/offer to apply and the side-effects to fire. Pure. */
export function reduceActions(actions: VidyaAction[]): ActionEffects {
  const effects: ActionEffects = {
    highlights: [],
    annotations: [],
    notes: [],
    mood: null,
    offer: null,
    says: [],
    speaks: [],
    remembers: [],
    forgets: [],
    setStates: [],
    revealHints: [],
    escalateHints: 0,
    redrawMarks: false,
  };
  for (const action of actions) {
    switch (action.type) {
      case 'say':
        effects.says.push(action.text);
        break;
      case 'setMood':
        effects.mood = action.mood;
        break;
      case 'highlight':
        effects.highlights.push({
          targetId: action.targetId,
          level: action.level ?? 'primary',
          ttl: action.ttl,
        });
        break;
      case 'annotate':
        effects.annotations.push({
          targetId: action.targetId,
          mark: action.mark,
          level: action.level ?? 'primary',
          ttl: action.ttl,
        });
        break;
      case 'write':
        effects.notes.push({
          targetId: action.targetId,
          text: action.text,
          level: action.level ?? 'primary',
          ttl: action.ttl,
        });
        break;
      case 'point':
        effects.highlights.push({ targetId: action.targetId, level: 'primary', ttl: action.ttl });
        effects.annotations.push({
          targetId: action.targetId,
          mark: 'lookHere',
          level: 'primary',
          ttl: action.ttl,
        });
        break;
      case 'speak':
        effects.speaks.push(action.text);
        break;
      case 'remember':
        effects.remembers.push(action.text);
        break;
      case 'forget':
        effects.forgets.push({
          scope: action.scope,
          ...(action.target ? { target: action.target } : {}),
        });
        break;
      case 'setState':
        effects.setStates.push({ targetId: action.targetId, patch: action.patch });
        break;
      case 'revealHint':
        effects.revealHints.push(action.level);
        break;
      case 'escalateHint':
        effects.escalateHints += 1;
        break;
      case 'redrawMarks':
        effects.redrawMarks = true;
        break;
      default:
        if (isConsequential(action)) effects.offer = action;
    }
  }
  return effects;
}

/**
 * A compact description of the action vocabulary, for Vidya's reasoning prompt. She is told the
 * registered target ids and picks among these actions to point at the learner's actual working.
 */
export function describeActionVocabulary(): string {
  return [
    'You may return actions to act on the page the learner is looking at. Available actions:',
    '- say: {"type":"say","text":"..."} — speak to the learner (a nudge, never the final answer).',
    '- highlight: {"type":"highlight","targetId":"<id>","level":"primary|secondary|tertiary","ttl":<ms>} — glow a target.',
    '- annotate: {"type":"annotate","targetId":"<id>","mark":"underline|circle|arrow|bracket|check|crossOut|lookHere","level":"...","ttl":<ms>} — draw a hand-drawn mark.',
    '- write: {"type":"write","targetId":"<id>","text":"short note","level":"...","ttl":<ms>} — write a handwritten note beside a target (typed on by hand).',
    '- point: {"type":"point","targetId":"<id>","ttl":<ms>} — draw attention to a target.',
    '- setState: {"type":"setState","targetId":"<id>","patch":{...}} — demonstrate by doing: drive an interactive by patching its own state. Only for targets whose scene state is listed; the patch keys must match that state.',
    '- speak: {"type":"speak","text":"..."} — say it in your voice when voice is live; otherwise it appears as your handwritten line. Short, warm, never the final answer.',
    '- remember: {"type":"remember","text":"<a durable fact the learner just shared — a preferred name, a goal, a fear, an exam date>"} — save something worth carrying across sessions; use sparingly, never for transient chatter.',
    '- forget: {"type":"forget","scope":"show|fact|all","target":"<the fact to drop, for scope \'fact\'>"} — data rights: "show" reads back everything you remember about them, "fact" deletes the one they name, "all" wipes it. Deleting is confirm-before-execute — ask "want me to forget that?" and only emit a delete after they say yes. When they ask what you remember, offer that you can forget any of it.',
    '- setMood: {"type":"setMood","mood":"thinking|hint|correct|celebrate|waiting|idle"}.',
    '- revealHint: {"type":"revealHint","level":<n>} / escalateHint: {"type":"escalateHint"}.',
    '- redrawMarks: {"type":"redrawMarks"} — re-ink the marks you last drew when the learner refers back to a drawing/diagram/marks that have since faded ("that diagram you drew earlier", "draw it again"). Pair it with a say line owning that it faded. Only use it to bring your own past ink back — not as a first draw.',
    '- navigate/startPractice/switchModality — consequential; these are OFFERED to the learner, not forced.',
    'ttl (milliseconds) sets how long a mark stays before it fades — YOU decide per mark: a quick point ~2500, a note you want read ~6000, a lasting circle ~9000. Keep the screen uncluttered; marks are transient, not permanent.',
    'Only reference targetId values that appear in the provided target registry.',
  ].join('\n');
}
