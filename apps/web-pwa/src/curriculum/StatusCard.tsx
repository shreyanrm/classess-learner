'use client';

/**
 * What the learner sees while the brain is out looking for their syllabus (CURRICULUM.md §4).
 *
 * It is a status, not a syllabus. There is no skeleton list of chapters behind it and no
 * placeholder names, because a skeleton in the shape of a syllabus is a syllabus as far as a
 * child reading it is concerned. When the job refuses, the card becomes the own-syllabus door in
 * the same place, so the learner is never left at a dead end.
 */

import { type CurriculumStatusView, DISCOVERY_COPY, type DiscoveryPlaceholder } from '@wobo/sdk';
import { motion, useReducedMotion } from 'framer-motion';
import { MagneticButton, surface } from '../ui/kit';
import { useDiscoveryStatus } from './hooks';

/** The one honest word for each stage of the job, in the learner's language. */
const STAGE: Record<string, string> = {
  queued: 'Getting ready to look',
  searching: 'Looking for the official syllabus',
  fetching: 'Reading the board’s document',
  extracting: 'Writing out the chapters',
  checking: 'Checking them against the source',
  provisional: 'Found it',
  refused: 'I could not find an official one',
};

export function DiscoveryCard({
  placeholder,
  message,
  onOwnSyllabus,
  onFinished,
}: {
  placeholder: DiscoveryPlaceholder | null;
  /** The brain's line for this level and subject, when it sent one. */
  message?: string;
  onOwnSyllabus(): void;
  onFinished?(status: CurriculumStatusView): void;
}) {
  const reduce = useReducedMotion();
  const live = useDiscoveryStatus(placeholder?.jobId ?? null, onFinished);
  const state = live?.state ?? placeholder?.state ?? null;
  const refused = state === 'refused';
  const line =
    live?.message?.trim() ||
    placeholder?.message?.trim() ||
    message?.trim() ||
    (refused ? DISCOVERY_COPY.refused : DISCOVERY_COPY.looking);

  return (
    <section
      aria-live="polite"
      style={{
        display: 'grid',
        gap: 12,
        padding: 16,
        background: surface.card,
        borderRadius: surface.radius.card,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {!refused && (
          <motion.span
            aria-hidden
            animate={reduce ? undefined : { opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--wobo-ultramarine)',
            }}
          />
        )}
        <span style={{ fontWeight: 560 }}>
          {state ? (STAGE[state] ?? STAGE.searching) : STAGE.searching}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, color: surface.inkSoft }}>
        {line}
      </p>

      <p style={{ margin: 0, fontSize: '0.8rem', color: surface.inkFaint }}>
        Nothing is here yet because I have nothing to show you yet. I will not make chapters up.
      </p>

      <div>
        <MagneticButton variant={refused ? 'primary' : 'quiet'} size="sm" onClick={onOwnSyllabus}>
          Show me my syllabus
        </MagneticButton>
      </div>
    </section>
  );
}

/** The empty world: no board chosen on this device yet. One line, one door. */
export function EmptyWorldCard({ onChooseBoard }: { onChooseBoard(): void }) {
  return (
    <section
      style={{
        display: 'grid',
        gap: 12,
        padding: 16,
        background: surface.card,
        borderRadius: surface.radius.card,
      }}
    >
      <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>{DISCOVERY_COPY.empty}</p>
      <div>
        <MagneticButton size="sm" onClick={onChooseBoard}>
          Choose your board
        </MagneticButton>
      </div>
    </section>
  );
}
