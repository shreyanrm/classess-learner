'use client';

/**
 * Reviewed copy, rendered.
 *
 * One rule governs this file: it draws what `docs/legal/**` says and never edits it. The only
 * transformations are the two the source itself asks for — a `[REVIEW: …]` question for counsel is
 * removed and counted upstream in `markdown.ts`, and a bracketed blank is drawn as a visible blank
 * rather than as prose, so nobody reads `[30 days]` as a decided term.
 *
 * Cross-references between the documents are written in the source as code spans (`cookies.md`).
 * Where the named document is one we hold, the span becomes a link to it; where it is not, it stays
 * exactly the code span the author wrote.
 */

import type { ReactNode } from 'react';
import { resolveSlot } from '../site/identity';
import { SiteLink } from '../site/nav';
import { crossReference } from './catalog';
import { type Block, type Inline, trimPlainWordsLabel } from './markdown';

export function Spans({
  spans,
  known,
}: {
  spans: readonly Inline[];
  known: readonly string[];
}): ReactNode {
  return spans.map((span, i) => {
    const key = `${span.kind}-${i}`;
    switch (span.kind) {
      case 'strong':
        return <strong key={key}>{span.text}</strong>;
      case 'code': {
        const href = crossReference(span.text, known);
        if (href) {
          return (
            <SiteLink key={key} href={href}>
              {span.text.replace(/\.md$/, '').replace(/-/g, ' ')}
            </SiteLink>
          );
        }
        return <code key={key}>{span.text}</code>;
      }
      case 'link':
        return span.href.startsWith('/') ? (
          <SiteLink key={key} href={span.href}>
            {span.text}
          </SiteLink>
        ) : (
          <a key={key} href={span.href} rel="noreferrer">
            {span.text}
          </a>
        );
      case 'placeholder': {
        // A bracket the legal set already answers elsewhere is filled in, so the same reader is
        // not told support@heywobo.com on one page and a dash on the next (site/identity.ts).
        // Anything genuinely undecided stays a visible gap.
        const decided = resolveSlot(span.text);
        if (decided) return <span key={key}>{decided}</span>;
        return (
          <span key={key} className="st-slot" title="Not decided yet">
            {span.text}
          </span>
        );
      }
      default:
        return <span key={key}>{span.text}</span>;
    }
  });
}

/** One parsed block. */
function One({ block, known }: { block: Block; known: readonly string[] }): ReactNode {
  switch (block.kind) {
    case 'heading': {
      const Tag = (block.level <= 2 ? 'h2' : 'h3') as 'h2' | 'h3';
      return <Tag id={block.id}>{block.text}</Tag>;
    }
    case 'paragraph':
      return (
        <p>
          <Spans spans={block.spans} known={known} />
        </p>
      );
    case 'quote':
      return (
        <blockquote className="st-plain">
          {block.paragraphs.map((spans, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: paragraphs of a static document
            <p key={i}>
              <Spans spans={spans} known={known} />
            </p>
          ))}
        </blockquote>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag>
          {block.items.map((spans, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: items of a static document
            <li key={i}>
              <Spans spans={spans} known={known} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'table':
      return (
        <div className="st-scroll">
          <table className="st-grid">
            <thead>
              <tr>
                {block.head.map((spans, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: columns of a static document
                  <th key={i} scope="col">
                    <Spans spans={spans} known={known} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: rows of a static document
                <tr key={r}>
                  {row.map((spans, c) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: cells of a static document
                    <td key={c}>
                      <Spans spans={spans} known={known} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return <hr />;
  }
}

/** A run of parsed blocks, in order. */
export function Markdown({
  blocks,
  known,
}: {
  blocks: readonly Block[];
  known: readonly string[];
}) {
  return (
    <>
      {blocks.map((block, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the document is static for the life of the page
        <One key={i} block={block} known={known} />
      ))}
    </>
  );
}

/** The plain-words card on its own, so a page can lift it above the body. */
export function PlainWords({
  paragraphs,
  known,
}: {
  paragraphs: readonly Inline[][];
  known: readonly string[];
}) {
  return (
    <aside className="st-plain" aria-label="In plain words">
      <span className="hand">In plain words</span>
      {trimPlainWordsLabel(paragraphs).map((spans, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: paragraphs of a static document
        <p key={i}>
          <Spans spans={spans} known={known} />
        </p>
      ))}
    </aside>
  );
}
