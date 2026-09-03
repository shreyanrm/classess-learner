'use client';

/**
 * The provenance a learner reads (CURRICULUM.md §5).
 *
 * Plain language, never a badge with a number, never a colour that implies more certainty than we
 * have. The brain's own label always wins; these fall back to the four canonical lines when a
 * screen is rendering from the offline cache.
 */

import { type CurriculumSourceRef, type CurriculumStatus, labelFor, sourceLine } from '@wobo/sdk';
import { surface } from '../ui/kit';

/** The one line that says how much we actually know about this syllabus. */
export function ProvenanceLabel({
  status,
  label,
  name,
  version,
  style,
}: {
  status: CurriculumStatus;
  /** The brain's own words, when it sent them. */
  label?: string;
  name?: string;
  version?: string | null;
  style?: React.CSSProperties;
}) {
  const text = label?.trim() || labelFor(status, { name, version });
  return (
    <p
      style={{
        margin: 0,
        fontSize: '0.82rem',
        lineHeight: 1.45,
        color: status === 'verified' ? surface.inkSoft : surface.inkFaint,
        ...style,
      }}
    >
      {text}
    </p>
  );
}

/** Where one node came from — the document and the page, or the learner's own hand. */
export function SourceNote({
  sourceRef,
  own = false,
  style,
}: {
  sourceRef: CurriculumSourceRef | null;
  own?: boolean;
  style?: React.CSSProperties;
}) {
  const text = sourceLine(sourceRef, own);
  if (!text) return null;
  const url = own ? null : sourceRef?.url;
  return (
    <span style={{ fontSize: '0.75rem', color: surface.inkFaint, ...style }}>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}
        >
          {text}
        </a>
      ) : (
        text
      )}
    </span>
  );
}
