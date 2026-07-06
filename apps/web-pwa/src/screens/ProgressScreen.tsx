'use client';

/**
 * Progress — the knowledge twin as hero (DESIGN.md §8, §11). One full-bleed living constellation,
 * one line of identity above it, one calm question below it. No dashboards, no number cards.
 * Tap a star for a quiet card: plain-language mastery, its evidence, and two doors.
 */

import { ATOM_NODE_IDS, type OntologyNode } from '@classess/sdk';
import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from '../shell/router';
import { useViewport } from '../shell/useViewport';
import { useProgress } from '../store/progress';
import { useSdk } from '../store/sdk';
import { MagneticButton } from '../ui/kit';
import { useVidyaChat } from '../vidya/chat';
import { Whisper } from './Learn';
import { Constellation } from './progress/Constellation';
import {
  BAND_LANGUAGE,
  type Band,
  readSeen,
  STARS,
  type Star,
  type StarState,
  starById,
  starState,
  writeSeen,
} from './progress/twin-data';

/** The card's small echo of the star it describes. */
function StateDot({ state }: { state: StarState }) {
  const base = { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 } as const;
  if (state === 'independent')
    return <span style={{ ...base, background: 'var(--clss-ultramarine)' }} />;
  if (state === 'supported')
    return <span style={{ ...base, border: '1.25px solid var(--clss-ultramarine)' }} />;
  return <span style={{ ...base, background: 'var(--clss-ink-100)' }} />;
}

export function ProgressScreen() {
  const router = useRouter();
  const sdk = useSdk();
  const { completed, streakDays } = useProgress();
  const { ask, busy } = useVidyaChat();
  const { publishPage, publishCurriculum } = useVidyaBus();
  const { isDesktop } = useViewport();

  const mapRef = useRegisterTarget<HTMLDivElement>('twin-constellation', {
    kind: 'map',
    label: 'the knowledge twin — every star is a concept; ultramarine means mastered',
  });
  const askRef = useRegisterTarget<HTMLInputElement>('twin-ask', {
    kind: 'input',
    label: 'the twin query bar — the learner asks about their own knowledge here',
  });

  // Real governed views: mastery bands + the atom's ontology nodes back the real stars.
  const [bands, setBands] = useState<ReadonlyMap<string, Band>>(new Map());
  const [nodeNames, setNodeNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const ids = Object.values(ATOM_NODE_IDS);
        const [bandViews, nodes] = await Promise.all([
          sdk.kgtopg.mastery.getBands(sdk.config.mockSubjectId),
          Promise.all(ids.map((id) => sdk.kgtopg.ontology.getNode(id))),
        ]);
        if (!live) return;
        setBands(new Map(bandViews.map((b) => [b.node_id, b.band])));
        const names: Record<string, string> = {};
        for (const n of nodes.filter((n): n is OntologyNode => n != null))
          names[n.node_id] = n.name;
        setNodeNames(names);
      } catch {
        // governed views unavailable — the twin still renders from local completions
      }
    })();
    return () => {
      live = false;
    };
  }, [sdk]);

  const states = useMemo(() => {
    const m: Record<string, StarState> = {};
    for (const s of STARS) m[s.id] = starState(s, bands, completed);
    return m;
  }, [bands, completed]);
  const mastered = useMemo(
    () => STARS.filter((s) => states[s.id] === 'independent').length,
    [states],
  );

  const nameOf = useCallback(
    (star: Star) => (star.nodeId ? (nodeNames[star.nodeId] ?? star.name) : star.name),
    [nodeNames],
  );

  // Newly-completed since last visit replay their ignite once, then are marked seen.
  const [seenAtMount] = useState(readSeen);
  const ignited = useMemo(
    () => new Set([...completed].filter((id) => !seenAtMount.has(id))),
    [completed, seenAtMount],
  );
  useEffect(() => {
    writeSeen(completed);
  }, [completed]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? starById(selectedId) : undefined;
  const selectedState: StarState = selected ? (states[selected.id] ?? 'unlit') : 'unlit';

  // She reads this page at code level: the whole constellation, star by star.
  useEffect(() => {
    publishPage({
      route: 'progress',
      state: {
        title: 'your knowledge twin',
        mastered,
        total: STARS.length,
        constellation: STARS.map((s) => ({ name: nameOf(s), state: states[s.id] })),
      },
    });
  }, [publishPage, states, mastered, nameOf]);

  useEffect(() => {
    if (!selected) return;
    publishCurriculum({
      nodeId: selected.nodeId ?? selected.id,
      nodeName: nameOf(selected),
      band: selectedState,
      prerequisiteIds: selected.prereqIds,
    });
  }, [selected, selectedState, publishCurriculum, nameOf]);

  // Evidence: real attempts recorded against the star's ontology node this session.
  const attempts = useMemo(() => {
    if (!selected?.nodeId) return 0;
    return sdk.events
      .getLog()
      .filter(
        (e) =>
          e.context.ontology_node_id === selected.nodeId &&
          (e.event_type === 'practice.item.answered.v1' ||
            e.event_type === 'learn.attempt.submitted.v1'),
      ).length;
  }, [sdk, selected]);

  const evidenceLine = !selected
    ? ''
    : attempts > 0
      ? `based on ${attempts} attempt${attempts === 1 ? '' : 's'}`
      : selected.topicId && completed.has(selected.topicId)
        ? 'based on your completed course'
        : 'no attempts yet';

  const [draft, setDraft] = useState('');
  const submitQuery = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    sdk.events.record('twin.query.asked.v1', {
      asker: 'learner',
      query_text: text,
      scope: 'subject',
    });
    void ask(text);
  };

  const openLearn = () => {
    if (!selected) return;
    if (selected.topicId) router.navigate({ name: 'course', topicId: selected.topicId });
    else router.navigate({ name: 'subject', subjectId: 'math', intent: 'learn' });
  };

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Whisper onClick={() => router.navigate({ name: 'home' })}>◦ home</Whisper>

      {/* one line of identity — the count that is yours, and the streak whisper */}
      <header style={{ paddingTop: 76, textAlign: 'center' }}>
        <div
          style={{
            fontSize: '1.18rem',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--clss-ink-900)',
          }}
        >
          {mastered} of {STARS.length} concepts are yours
        </div>
        <div style={{ marginTop: 6, fontSize: '0.85rem', color: 'var(--clss-ink-500)' }}>
          day {streakDays} of being a learner
        </div>
      </header>

      {/* the twin — full bleed, centred, breathing */}
      <div ref={mapRef} style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <Constellation
          states={states}
          ignited={ignited}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* ask your twin — one calm question, answered by Vidya over this exact page */}
      <form
        onSubmit={submitQuery}
        style={{ width: 'min(560px, calc(100% - 48px))', margin: '0 auto', paddingBottom: 26 }}
      >
        <input
          ref={askRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="ask your twin: what am I weakest at…"
          aria-label="Ask your twin"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '13px 16px',
            fontSize: '0.95rem',
            fontFamily: 'inherit',
            border: '0.5px solid var(--clss-hairline-on-paper-strong)',
            borderRadius: 'var(--clss-radius-sm)',
            outline: 'none',
            background: 'var(--clss-paper)',
            color: 'var(--clss-ink-900)',
          }}
        />
        <div
          style={{
            marginTop: 8,
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--clss-ink-300)',
            minHeight: 18,
          }}
        >
          {busy ? 'Vidya is thinking…' : ''}
        </div>
      </form>

      {/* the star card — quiet, to the side */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            key={selected.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{
              position: 'fixed',
              ...(isDesktop
                ? {
                    right: 28,
                    top: 0,
                    bottom: 0,
                    margin: 'auto 0',
                    height: 'fit-content',
                    width: 300,
                  }
                : { left: 16, right: 16, bottom: 104 }),
              background: 'var(--clss-paper)',
              border: '0.5px solid var(--clss-hairline-on-paper-strong)',
              borderRadius: 'var(--clss-radius-sm)',
              padding: '18px 18px 16px',
              zIndex: 20,
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 8,
                right: 10,
                border: 'none',
                background: 'transparent',
                color: 'var(--clss-ink-300)',
                fontSize: '0.95rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: 4,
                lineHeight: 1,
              }}
            >
              ×
            </button>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 500,
                color: 'var(--clss-ink-900)',
                letterSpacing: '-0.01em',
                paddingRight: 18,
              }}
            >
              {nameOf(selected)}
            </div>
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.9rem',
                color: 'var(--clss-ink-700)',
              }}
            >
              <StateDot state={selectedState} />
              {BAND_LANGUAGE[selectedState]}
            </div>
            <div style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--clss-ink-500)' }}>
              {evidenceLine}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <MagneticButton size="sm" variant="quiet" onClick={openLearn}>
                learn
              </MagneticButton>
              <MagneticButton
                size="sm"
                variant="quiet"
                onClick={() => router.navigate({ name: 'practice' })}
              >
                practice
              </MagneticButton>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
