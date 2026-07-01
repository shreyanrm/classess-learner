import { hairline, ink, space, typeScale } from '@classess/config';
import {
  ATOM_TARGET_NODE_ID,
  type ConsentTierView,
  createSdk,
  type MasteryBandView,
  type OntologyNode,
  type Session,
} from '@classess/sdk';
import { type Band, type ConceptState, ConceptTile, MasteryBand } from '@classess/ui';
import {
  parseActions,
  useRegisterTarget,
  useVidyaBus,
  VidyaLayer,
  VidyaProvider,
  type VidyaTurn,
} from '@classess/vidya';
import { type RefObject, useCallback, useEffect, useMemo, useState } from 'react';
import { LearnSurface } from './learn/LearnSurface';
import { PracticeSurface } from './learn/PracticeSurface';

const LLM_MODE = (import.meta.env.VITE_LLM_MODE as 'mock' | 'live' | undefined) ?? 'mock';
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL as string | undefined;

const BAND_LABEL: Record<Band, string> = {
  not_started: 'not started',
  emerging: 'emerging',
  developing: 'developing',
  secure: 'secure',
  independent: 'independent',
};

function tileState(band: Band): ConceptState {
  if (band === 'independent') return 'mastered';
  if (band === 'not_started') return 'not_started';
  return 'in_progress';
}

interface Opener {
  equation: string;
  prompt: string;
}

function TodayView({
  session,
  node,
  band,
  initialBand,
  conceptRef,
  onOpen,
}: {
  session: Session | null;
  node: OntologyNode | null;
  band: Band;
  initialBand: Band;
  conceptRef: RefObject<HTMLDivElement | null>;
  onOpen: () => void;
}) {
  const moved = band !== initialBand;
  return (
    <main
      style={{
        flex: 1,
        width: '100%',
        maxWidth: 720,
        margin: '0 auto',
        padding: space[3],
        display: 'flex',
        flexDirection: 'column',
        gap: space[4],
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: typeScale.h2.size,
          fontWeight: typeScale.h2.weight,
          lineHeight: typeScale.h2.lineHeight,
        }}
      >
        Good to see you, {session?.display_name ?? 'there'}
      </h1>

      <section style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}>
        <span style={{ fontSize: typeScale.caption.size, color: ink[500] }}>Your next step</span>
        <div ref={conceptRef}>
          <ConceptTile
            title={node?.name ?? 'Linear equations in one variable'}
            state={tileState(band)}
            accent={node?.accent}
            onActivate={onOpen}
          />
        </div>
        <MasteryBand band={band} accent={node?.accent} />
      </section>

      {moved && (
        <p style={{ margin: 0, fontSize: typeScale.body.size, color: ink[900] }}>
          You moved from {BAND_LABEL[initialBand]} to {BAND_LABEL[band]} on this concept today.
        </p>
      )}

      <p style={{ margin: 0, fontSize: typeScale.caption.size, color: ink[500] }}>
        Open the concept to work through it, and tap Vidya any time.
      </p>
    </main>
  );
}

function AppInner() {
  const sdk = useMemo(() => createSdk({ llmMode: LLM_MODE, gatewayUrl: GATEWAY_URL }), []);
  const bus = useVidyaBus();
  const [session, setSession] = useState<Session | null>(null);
  const [node, setNode] = useState<OntologyNode | null>(null);
  const [band, setBand] = useState<Band>('not_started');
  const [initialBand, setInitialBand] = useState<Band>('not_started');
  const [opener, setOpener] = useState<Opener>({
    equation: '2x + 3 = 7',
    prompt: 'Find the value of x. Show each step.',
  });
  const [turns, setTurns] = useState<VidyaTurn[]>([]);
  const [view, setView] = useState<'today' | 'learn' | 'practice'>('today');

  const conceptRef = useRegisterTarget<HTMLDivElement>('concept-linear-eq', {
    kind: 'concept',
    label: 'the linear equations concept the learner is on',
  });

  const nodeId = node?.node_id ?? ATOM_TARGET_NODE_ID;

  const refreshBands = useCallback(async () => {
    if (!session) return;
    const bands = await sdk.kgtopg.mastery.getBands(session.subject_id);
    const bandView = bands.find((b: MasteryBandView) => b.node_id === ATOM_TARGET_NODE_ID);
    setBand((bandView?.band as Band) ?? 'not_started');
  }, [sdk, session]);

  useEffect(() => {
    let live = true;
    (async () => {
      const s = await sdk.identity.getSession();
      const target = await sdk.kgtopg.ontology.getNode(ATOM_TARGET_NODE_ID);
      const bands = await sdk.kgtopg.mastery.getBands(s.subject_id);
      const bandView = bands.find((b: MasteryBandView) => b.node_id === ATOM_TARGET_NODE_ID);
      const content = await sdk.content.getVerified(ATOM_TARGET_NODE_ID, 'opener');
      if (!live) return;
      const b = (bandView?.band as Band) ?? 'not_started';
      setSession(s);
      setNode(target);
      setBand(b);
      setInitialBand(b);
      const body = content?.body as Opener | undefined;
      if (body?.equation) setOpener({ equation: body.equation, prompt: body.prompt });
      setTurns([
        {
          id: 'seed',
          role: 'vidya',
          text: `Hi ${s.display_name ?? 'there'}, I am Vidya. Whenever you want to think something through, I am here.`,
        },
      ]);
    })();
    return () => {
      live = false;
    };
  }, [sdk]);

  useEffect(() => {
    if (view === 'today') bus.publishPage({ route: 'today', state: {} });
  }, [bus, view]);

  // Entering the learn loop is a meaningful action: it emits an event through the contract.
  const enterLearn = () => {
    if (node) {
      sdk.events.record(
        'learn.node.entered.v1',
        { node_id: node.node_id, entry: 'map', initial_band: band },
        { ontologyNodeId: node.node_id },
      );
    }
    setView('learn');
  };

  const ask = async (text: string) => {
    setTurns((prev) => [...prev, { id: `u-${prev.length}`, role: 'user', text }]);
    const consentTier: ConsentTierView = session?.consent_tier ?? 'un_elevated';

    sdk.events.record('vidya.opened.v1', { trigger: 'tap' }, { ontologyNodeId: nodeId });
    sdk.events.record(
      'vidya.turn.user.v1',
      { turn_id: crypto.randomUUID(), input_mode: 'text', text, has_audio: false },
      { ontologyNodeId: nodeId },
    );
    bus.publishTurn({
      recentTurns: turns.map((t) => ({ role: t.role, text: String(t.text) })),
      lastUserInput: text,
    });

    try {
      const result = await sdk.llm.invoke(
        'vidya.turn',
        { context: bus.assembleContext() },
        { consentTier },
      );
      const output = result.output as { say?: string; actions?: unknown[]; grounded?: boolean };
      const say = output.say ?? 'Let us look at your working together.';
      setTurns((prev) => [...prev, { id: `v-${prev.length}`, role: 'vidya', text: say }]);
      bus.dispatch(parseActions(output.actions ?? []));

      sdk.events.record(
        'vidya.perceived.work.v1',
        { node_id: nodeId, via: 'event_stream', source: 'canvas' },
        { ontologyNodeId: nodeId },
      );
      sdk.events.record(
        'vidya.turn.assistant.v1',
        {
          turn_id: crypto.randomUUID(),
          assistance_level: 'hint',
          hint_level: 1,
          grounded: output.grounded ?? true,
          track: result.track,
          handed_answer: false,
        },
        { ontologyNodeId: nodeId },
      );
    } catch {
      setTurns((prev) => [
        ...prev,
        { id: `v-${prev.length}`, role: 'vidya', text: 'Give me a moment, then ask me again.' },
      ]);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          padding: `${space[3]}px ${space[2]}px`,
          borderBottom: `1px solid ${hairline.onPaper}`,
        }}
      >
        <span style={{ fontSize: typeScale.h3.size, fontWeight: 600 }}>Classess Learner</span>
      </header>

      {view === 'today' && (
        <TodayView
          session={session}
          node={node}
          band={band}
          initialBand={initialBand}
          conceptRef={conceptRef}
          onOpen={enterLearn}
        />
      )}
      {view === 'learn' && (
        <LearnSurface
          equation={opener.equation}
          prompt={opener.prompt}
          nodeId={nodeId}
          nodeName={node?.name ?? 'Linear equations in one variable'}
          onAsk={ask}
          onPractice={() => setView('practice')}
          onExit={() => setView('today')}
        />
      )}
      {view === 'practice' && (
        <PracticeSurface
          sdk={sdk}
          nodeId={nodeId}
          onEvidence={refreshBands}
          onExit={() => {
            void refreshBands();
            setView('today');
          }}
        />
      )}

      <VidyaLayer turns={turns} onSend={ask} />
    </div>
  );
}

export function App() {
  return (
    <VidyaProvider>
      <AppInner />
    </VidyaProvider>
  );
}
