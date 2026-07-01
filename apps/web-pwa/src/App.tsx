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
  useRegisterTarget,
  useVidyaBus,
  VidyaLayer,
  VidyaProvider,
  type VidyaTurn,
} from '@classess/vidya';
import { useEffect, useMemo, useState } from 'react';

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
  const sdk = useMemo(() => createSdk(), []);
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

  const send = (text: string) => {
    setTurns((prev) => [...prev, { id: `u-${prev.length}`, role: 'user', text }]);
    // Vidya perceives the page and points at the concept. She replies with a nudge, never the answer.
    // (Task 20 swaps this for the live, verifier-grounded gateway turn returning say + actions.)
    bus.dispatch([
      { type: 'setMood', mood: 'thinking' },
      { type: 'highlight', targetId: 'concept-linear-eq', level: 'primary' },
      { type: 'annotate', targetId: 'concept-linear-eq', mark: 'lookHere', level: 'secondary' },
    ]);
    const reply = 'That is the topic we are on. Open it and we will pose the first step together.';
    setTurns((prev) => [...prev, { id: `v-${prev.length}`, role: 'vidya', text: reply }]);
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
