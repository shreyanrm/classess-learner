'use client';

/**
 * Progress — the knowledge twin as hero (DESIGN.md §8, §11). A daylight field: a bright white
 * sky where nebulae wash in the subject hues and every concept is a star. One line of
 * identity above the sky, one calm question floating on glass at its foot. No dashboards, no
 * number cards. Tap a star for a quiet glass card: plain-language mastery, evidence, two doors.
 */

import { ATOM_NODE_IDS, type OntologyNode } from '@classess/sdk';
import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from '../shell/router';
import { useViewport } from '../shell/useViewport';
import { useProgress } from '../store/progress';
import { useSdk } from '../store/sdk';
import { CloseIcon } from '../ui/icons';
import { MagneticButton, Reveal } from '../ui/kit';
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

/** The daylight field — nebulae in the subject hues over white. Airy, bright, premium. */
const DAYLIGHT = [
  'radial-gradient(58% 46% at 18% 12%, rgba(49,72,255,0.14), transparent 62%)',
  'radial-gradient(44% 38% at 84% 26%, rgba(15,163,177,0.1), transparent 64%)',
  'radial-gradient(46% 42% at 62% 88%, rgba(204,30,122,0.08), transparent 66%)',
  'radial-gradient(30% 26% at 38% 60%, rgba(240,160,48,0.06), transparent 70%)',
  '#FFFFFF',
].join(', ');

/** The card's small echo of the star it describes — daylight register. */
function StateDot({ state }: { state: StarState }) {
  const base = { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 } as const;
  if (state === 'independent') return <span style={{ ...base, background: '#1F35E0' }} />;
  if (state === 'supported') return <span style={{ ...base, border: '1.25px solid #1F35E0' }} />;
  return <span style={{ ...base, background: '#E3E5EE' }} />;
}

export function ProgressScreen() {
  const router = useRouter();
  const sdk = useSdk();
  const { completed, streakDays } = useProgress();
  const { ask, busy } = useVidyaChat();
  const { publishPage, publishCurriculum } = useVidyaBus();
  const { isDesktop } = useViewport();
  const reduced = useReducedMotion();

  const mapRef = useRegisterTarget<HTMLDivElement>('twin-constellation', {
    kind: 'map',
    label: 'the knowledge twin — every star is a concept; a glowing star means mastered',
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
      <Whisper onClick={() => router.navigate({ name: 'home' })}>Home</Whisper>

      {/* one line of identity — the count that is yours, and the streak whisper */}
      <Reveal>
        <header style={{ paddingTop: 76, textAlign: 'center' }}>
          <div
            style={{
              fontSize: '1.45rem',
              fontWeight: 650,
              letterSpacing: '-0.03em',
              color: '#121316',
            }}
          >
            {mastered} of {STARS.length} concepts are yours
          </div>
          <div style={{ marginTop: 5, fontSize: '0.85rem', color: '#989AA4' }}>
            day {streakDays} of being a learner · tap a star to see its story
          </div>
        </header>
      </Reveal>

      {/* the daylight field — the twin's bright sky, white washed with the subject hues */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 26, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ type: 'spring', stiffness: 230, damping: 27, mass: 0.9, delay: 0.08 }}
        style={{
          flex: 1,
          minHeight: 340,
          position: 'relative',
          margin: '18px clamp(14px, 3vw, 44px) clamp(14px, 2.5vh, 26px)',
          borderRadius: 3,
          overflow: 'hidden',
          background: DAYLIGHT,
          border: '1px solid #E9E9EE',
        }}
      >
        {/* a slow aurora drifting behind the stars — alive even at rest */}
        {!reduced && (
          <motion.div
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ duration: 140, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            style={{
              position: 'absolute',
              inset: '-35%',
              background:
                'conic-gradient(from 0deg at 50% 50%, rgba(49,72,255,0.06), rgba(204,30,122,0.03), rgba(15,163,177,0.05), rgba(240,160,48,0.025), rgba(49,72,255,0.06))',
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }}
          />
        )}

        <div ref={mapRef} style={{ position: 'absolute', inset: 0 }}>
          <Constellation
            states={states}
            ignited={ignited}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* ask your twin — one calm question floating on glass at the sky's foot */}
        <form
          onSubmit={submitQuery}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 16,
            width: 'min(560px, calc(100% - 32px))',
          }}
        >
          <div
            style={{
              marginBottom: 6,
              textAlign: 'center',
              fontSize: '0.8rem',
              color: '#5C5E66',
              minHeight: 18,
            }}
          >
            {busy ? 'Vidya is thinking…' : ''}
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid #E9E9EE',
              borderRadius: 3,
              display: 'flex',
            }}
          >
            <input
              ref={askRef}
              className="twin-ask-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="ask your twin: what am I weakest at…"
              aria-label="Ask your twin"
              style={{
                flex: 1,
                boxSizing: 'border-box',
                padding: '13px 16px',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: '#121316',
              }}
            />
          </div>
        </form>
        <style>{'.twin-ask-input::placeholder{color:#989AA4}'}</style>
      </motion.div>

      {/* the star card — light glass over the daylight field, quiet, to the side */}
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
                    right: 'clamp(30px, 4.5vw, 64px)',
                    top: 0,
                    bottom: 0,
                    margin: 'auto 0',
                    height: 'fit-content',
                    width: 300,
                  }
                : { left: 28, right: 28, bottom: 128 }),
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid #E9E9EE',
              borderRadius: 3,
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
                color: '#989AA4',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: 4,
                lineHeight: 1,
              }}
            >
              <CloseIcon size={14} />
            </button>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 550,
                color: '#121316',
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
                color: '#5C5E66',
              }}
            >
              <StateDot state={selectedState} />
              {BAND_LANGUAGE[selectedState]}
            </div>
            <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#989AA4' }}>
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
