import { hairline, ink, space, typeScale } from '@classess/config';
import {
  ATOM_TARGET_NODE_ID,
  createSdk,
  type MasteryBandView,
  type OntologyNode,
  type Session,
} from '@classess/sdk';
import { type Band, type ConceptState, ConceptTile, MasteryBand } from '@classess/ui';
import { VidyaPanel, VidyaPresence, type VidyaTurn } from '@classess/vidya';
import { useEffect, useMemo, useState } from 'react';

/** Map a mastery band onto the ConceptTile's lifecycle state (colour is earned at independent). */
function tileState(band: Band): ConceptState {
  if (band === 'independent') return 'mastered';
  if (band === 'not_started') return 'not_started';
  return 'in_progress';
}

/**
 * Phase 0 app shell: a calm, monochrome chrome that proves the spine wires together end to end —
 * identity, the KGtoPG governed ontology + mastery band, verified seed content, and Vidya through the
 * LLM seam — all on mock/seed data. No product features yet.
 */
export function App() {
  const sdk = useMemo(() => createSdk(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [node, setNode] = useState<OntologyNode | null>(null);
  const [band, setBand] = useState<Band>('not_started');
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<VidyaTurn[]>([]);

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

  const send = async (text: string) => {
    setTurns((prev) => [...prev, { id: `u-${prev.length}`, role: 'user', text }]);
    const result = await sdk.llm.invoke(
      'vidya.turn',
      { text },
      { consentTier: session?.consent_tier ?? 'un_elevated' },
    );
    const reply =
      (result.output as { text?: string }).text ?? 'Let us look at your working together.';
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
          <ConceptTile
            title={node?.name ?? 'Linear equations in one variable'}
            state={tileState(band)}
            accent={node?.accent}
          />
          <MasteryBand band={band} accent={node?.accent} />
        </section>

        <p style={{ margin: 0, fontSize: typeScale.caption.size, color: ink[500] }}>
          Tap Vidya any time to talk it through.
        </p>
      </main>

      <VidyaPresence fixed onTap={() => setOpen((o) => !o)} />
      <VidyaPanel open={open} onClose={() => setOpen(false)} turns={turns} onSend={send} />
    </div>
  );
}
