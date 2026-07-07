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
import {
  AmbientWash,
  CountUp,
  FROST,
  fluidType,
  MagneticButton,
  PARALLAX,
  Reveal,
  useParallax,
} from '../ui/kit';
import { useVidyaChat } from '../vidya/chat';
import { Whisper } from './Learn';
import { Constellation } from './progress/Constellation';
import { ProgressReport } from './progress/Report';
import {
  BAND_LANGUAGE,
  type Band,
  readSeen,
  STARS,
  type Star,
  type StarState,
  starById,
  starState,
  studyPath,
  writeSeen,
} from './progress/twin-data';

/** The card's small echo of the star it describes — daylight register. */
function StateDot({ state }: { state: StarState }) {
  const base = { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 } as const;
  if (state === 'independent')
    return <span style={{ ...base, background: 'var(--clss-ultramarine)' }} />;
  if (state === 'supported')
    return <span style={{ ...base, border: '1.25px solid var(--clss-ultramarine)' }} />;
  return <span style={{ ...base, background: 'var(--clss-card-border)' }} />;
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
    // She reads the twin at code level: which concepts are mastered, which lean on support, the
    // weakest one to point at. Fills the perception seam so she reasons about contents, not a box.
    getSceneState: () => {
      const constellation = STARS.map((s) => ({ name: nameOf(s), state: states[s.id] ?? 'unlit' }));
      const weakest =
        constellation.find((c) => c.state === 'supported')?.name ??
        constellation.find((c) => c.state === 'unlit')?.name ??
        null;
      return { mastered, total: STARS.length, weakest, constellation };
    },
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

  // The study path: the ordered prerequisite chain to the selected star, lit on the sky.
  const pathSteps = useMemo(
    () => (selected ? studyPath(selected, states) : []),
    [selected, states],
  );
  const [pathReplay, setPathReplay] = useState(0);
  // The twin sits on the context plane (MOTION.md §1): it lags gently as the report scrolls up.
  const skyParallax = useParallax<HTMLDivElement>(PARALLAX.context, { max: 90 });

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

  const openStep = (star: Star) => {
    if (star.topicId) router.navigate({ name: 'course', topicId: star.topicId });
    else router.navigate({ name: 'subject', subjectId: 'math', intent: 'learn' });
  };

  const openLearn = () => {
    if (selected) openStep(selected);
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      <Whisper onClick={() => router.navigate({ name: 'home' })}>Home</Whisper>

      {/* the twin holds the first screen; the report scrolls in beneath it */}
      <div
        style={{
          height: '100dvh',
          minHeight: 480,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* one line of identity — the count that is yours, and the streak whisper */}
        <Reveal>
          <header style={{ paddingTop: 76, textAlign: 'center' }}>
            <div
              style={{
                fontSize: fluidType.heading,
                fontWeight: 650,
                letterSpacing: '-0.03em',
                color: 'var(--clss-ink)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <CountUp value={mastered} /> of {STARS.length} concepts are yours
            </div>
            <div
              style={{
                marginTop: 5,
                fontSize: fluidType.small,
                color: 'var(--clss-ink-faint)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Day <CountUp value={streakDays} /> of being a learner · tap a star, or scroll for your
              report
            </div>
          </header>
        </Reveal>

        {/* the constellation, drawn straight on the page — deep-space coolness pooled behind the
            stars (§1 ambient depth), an ultramarine void the twin ignites out of, both themes */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 26, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ type: 'spring', stiffness: 230, damping: 27, mass: 0.9, delay: 0.08 }}
          style={{
            flex: 1,
            minHeight: 340,
            position: 'relative',
            margin: '18px clamp(14px, 3vw, 44px) clamp(14px, 2.5vh, 26px)',
            // the sky is composed as one deliberate art panel — a hairline frames it, the wash
            // and dust stay contained, so the twin reads as a hero object, not a loose background
            border: '0.5px solid var(--clss-hairline-on-paper)',
            borderRadius: 3,
            overflow: 'hidden',
            isolation: 'isolate',
          }}
        >
          <AmbientWash
            gradient={
              'radial-gradient(58% 62% at 50% 42%, var(--clss-ultramarine-soft) 0%, transparent 60%),' +
              ' radial-gradient(120% 120% at 50% 46%, transparent 46%, var(--clss-ultramarine-soft) 140%)'
            }
          />
          <div ref={mapRef} style={{ position: 'absolute', inset: 0 }}>
            <div
              ref={skyParallax}
              style={{ position: 'absolute', inset: 0, willChange: 'transform' }}
            >
              <Constellation
                states={states}
                ignited={ignited}
                selectedId={selectedId}
                onSelect={setSelectedId}
                path={pathSteps}
                pathReplay={pathReplay}
              />
            </div>
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
                fontSize: fluidType.small,
                color: 'var(--clss-ink-soft)',
                minHeight: 18,
              }}
            >
              {busy ? 'Vidya is thinking…' : ''}
            </div>
            <div className="twin-ask-row" style={{ ...FROST, display: 'flex' }}>
              <input
                ref={askRef}
                className="twin-ask-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask your twin: what am I weakest at…"
                aria-label="Ask your twin"
                style={{
                  flex: 1,
                  boxSizing: 'border-box',
                  padding: '13px 16px',
                  fontSize: fluidType.body,
                  fontFamily: 'inherit',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--clss-ink)',
                }}
              />
            </div>
          </form>
          <style>
            {
              '.twin-ask-input::placeholder{color:var(--clss-ink-faint)}.twin-step:hover{background:var(--clss-tonal)}.twin-ask-row{transition:border-color .28s ease}.twin-ask-row:focus-within{border-color:var(--clss-ultramarine-ring)}'
            }
          </style>
        </motion.div>
      </div>

      {/* the report — strengths, growth, the shape of showing up, and an honest trajectory */}
      <ProgressReport states={states} nameOf={nameOf} mastered={mastered} />

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
                    // sit on the side away from the star so the lit path stays visible
                    ...(selected.x > 500
                      ? { left: 'clamp(30px, 4.5vw, 64px)' }
                      : { right: 'clamp(30px, 4.5vw, 64px)' }),
                    top: 0,
                    bottom: 0,
                    margin: 'auto 0',
                    height: 'fit-content',
                    width: 300,
                  }
                : { left: 28, right: 28, bottom: 128 }),
              ...FROST,
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
                color: 'var(--clss-ink-faint)',
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
                fontSize: fluidType.body,
                fontWeight: 550,
                color: 'var(--clss-ink)',
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
                fontSize: fluidType.body,
                color: 'var(--clss-ink-soft)',
              }}
            >
              <StateDot state={selectedState} />
              {BAND_LANGUAGE[selectedState]}
            </div>
            <div
              style={{ marginTop: 4, fontSize: fluidType.small, color: 'var(--clss-ink-faint)' }}
            >
              {evidenceLine}
            </div>

            {/* the study path — the ordered way in, each step a door to its course */}
            {pathSteps.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: fluidType.eyebrow,
                      fontWeight: 550,
                      letterSpacing: '0.02em',
                      color: 'var(--clss-ink-faint)',
                    }}
                  >
                    To make this yours
                  </div>
                  <button
                    type="button"
                    onClick={() => setPathReplay((r) => r + 1)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--clss-ultramarine)',
                      fontSize: fluidType.eyebrow,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      padding: '10px 6px',
                      margin: '-10px -6px',
                    }}
                  >
                    Show me the path
                  </button>
                </div>
                <ol
                  style={{
                    listStyle: 'none',
                    margin: '6px 0 0',
                    padding: 0,
                    maxHeight: '28dvh',
                    overflowY: 'auto',
                  }}
                >
                  {pathSteps.map((p) => (
                    <li key={p.star.id}>
                      <button
                        type="button"
                        className="twin-step"
                        onClick={() => openStep(p.star)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: 'calc(100% + 12px)',
                          minHeight: 44,
                          padding: '4px 6px',
                          margin: '0 -6px',
                          border: 'none',
                          borderRadius: 3,
                          background: 'transparent',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                        }}
                      >
                        {p.mastered ? (
                          <span
                            aria-hidden
                            style={{
                              width: 18,
                              height: 18,
                              flexShrink: 0,
                              borderRadius: '50%',
                              border: '1px solid rgba(31,53,224,0.25)',
                              display: 'grid',
                              placeItems: 'center',
                            }}
                          >
                            <svg width="9" height="8" viewBox="0 0 9 8" fill="none">
                              <title>Already yours</title>
                              <path
                                d="M1 4l2.4 2.6L8 1"
                                stroke="rgba(31,53,224,0.55)"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        ) : (
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              flexShrink: 0,
                              borderRadius: '50%',
                              background: 'var(--clss-ultramarine)',
                              color: '#FFFFFF',
                              fontSize: '0.66rem',
                              fontWeight: 650,
                              display: 'grid',
                              placeItems: 'center',
                            }}
                          >
                            {p.step}
                          </span>
                        )}
                        <span
                          style={{
                            flex: 1,
                            fontSize: fluidType.small,
                            lineHeight: 1.35,
                            color: p.mastered ? 'var(--clss-ink-faint)' : 'var(--clss-ink)',
                          }}
                        >
                          {nameOf(p.star)}
                        </span>
                        {p.mastered && (
                          <span
                            style={{
                              fontSize: fluidType.eyebrow,
                              color: 'var(--clss-ink-faint)',
                              flexShrink: 0,
                            }}
                          >
                            already yours
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}

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
