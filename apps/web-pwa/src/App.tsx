import { hairline, ink, space, typeScale } from '@classess/config';
import {
  ATOM_TARGET_NODE_ID,
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
import { useEffect, useMemo, useState } from 'react';

const LLM_MODE = (import.meta.env.VITE_LLM_MODE as 'mock' | 'live' | undefined) ?? 'mock';
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL as string | undefined;

function tileState(band: Band): ConceptState {
  if (band === 'independent') return 'mastered';
  if (band === 'not_started') return 'not_started';
  return 'in_progress';
}

/**
 * Phase 1 app shell. It boots the SDK, publishes its page + curriculum into the Vidya context bus,
 * and registers the concept tile as a target Vidya can draw on. When the learner talks to her, she
 * perceives the page and points at the actual concept — the connected presence, made visible. (The
 * live grounded turn from the gateway wires in with Vidya's five capabilities; this shell already
 * drives the whole bus -> dispatch -> overlay pipeline.)
 */
function AppInner() {
  const sdk = useMemo(() => createSdk({ llmMode: LLM_MODE, gatewayUrl: GATEWAY_URL }), []);
  const bus = useVidyaBus();
  const [session, setSession] = useState<Session | null>(null);
  const [node, setNode] = useState<OntologyNode | null>(null);
  const [band, setBand] = useState<Band>('not_started');
  const [turns, setTurns] = useState<VidyaTurn[]>([]);

  const conceptRef = useRegisterTarget<HTMLDivElement>('concept-linear-eq', {
    kind: 'concept',
    label: 'the linear equations concept the learner is on',
  });

  useEffect(() => {
    let live = true;
    (async () => {
      const s = await sdk.identity.getSession();
      const target = await sdk.kgtopg.ontology.getNode(ATOM_TARGET_NODE_ID);
      const bands = await sdk.kgtopg.mastery.getBands(s.subject_id);
      const view = bands.find((b: MasteryBandView) => b.node_id === ATOM_TARGET_NODE_ID);
      if (!live) return;
      setSession(s);
      setNode(target);
      setBand((view?.band as Band) ?? 'not_started');
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
    bus.publishPage({ route: 'today', state: { greeting: true } });
  }, [bus]);

  useEffect(() => {
    if (node) bus.publishCurriculum({ nodeId: node.node_id, nodeName: node.name, band });
  }, [bus, node, band]);

  const send = async (text: string) => {
    setTurns((prev) => [...prev, { id: `u-${prev.length}`, role: 'user', text }]);
    // The turn goes through the SDK: mock deterministically, or the live verifier-grounded gateway
    // (VITE_LLM_MODE=live). Either way Vidya perceives the assembled context and returns say + actions;
    // the actions dispatch through the bus and she draws on the page.
    bus.publishTurn({
      recentTurns: turns.map((t) => ({ role: t.role, text: String(t.text) })),
      lastUserInput: text,
    });
    const context = bus.assembleContext();
    try {
      const result = await sdk.llm.invoke(
        'vidya.turn',
        { context },
        { consentTier: session?.consent_tier ?? 'un_elevated' },
      );
      const output = result.output as { say?: string; actions?: unknown[] };
      const say = output.say ?? 'Let us look at your working together.';
      setTurns((prev) => [...prev, { id: `v-${prev.length}`, role: 'vidya', text: say }]);
      bus.dispatch(parseActions(output.actions ?? []));
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
            />
          </div>
          <MasteryBand band={band} accent={node?.accent} />
        </section>

        <p style={{ margin: 0, fontSize: typeScale.caption.size, color: ink[500] }}>
          Tap Vidya any time to talk it through.
        </p>
      </main>

      <VidyaLayer turns={turns} onSend={send} />
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
