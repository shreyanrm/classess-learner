'use client';

/**
 * The renderer for compiled copy.
 *
 * It draws the document tree `markdown.ts` defines and nothing else. There is no `dangerouslySet…`
 * anywhere near it: the copy is compiled to a tree at build time and rendered as elements, so a
 * stray angle bracket in a reviewed sentence is text, not markup.
 *
 * Two decisions worth naming:
 *
 *  · a paragraph that is nothing but a bold line is a SUB-HEADING. That is how the reviewed help
 *    articles are written, and rendering it as a bold paragraph would leave every article a flat
 *    wall with no outline for a screen reader to jump through.
 *  · a SLOT — `[support email]` — is drawn as a visible gap rather than dropped or filled in. The
 *    copy is honest that the address is not decided; the page has to be too.
 */

import { resolveSlot } from './identity';
import type { Block, Inline } from './markdown';
import { inlineText, isSubHeading } from './markdown';

/** A key that is stable for a given run of copy, so a re-render never reshuffles the list. */
function keyOf(prefix: string, index: number, text: string): string {
  return `${prefix}-${index}-${text.slice(0, 24)}`;
}

export function Runs({ runs }: { runs: readonly Inline[] }) {
  return (
    <>
      {runs.map((run, i) => {
        const key = keyOf(run.t, i, run.v);
        if (run.t === 'strong') return <strong key={key}>{run.v}</strong>;
        if (run.t === 'code') return <code key={key}>{run.v}</code>;
        if (run.t === 'slot') {
          // A slot the legal set already answers is filled in rather than drawn as a gap: the
          // About page was showing a dash where the terms page prints the address in full
          // (site/identity.ts). Anything genuinely undecided still shows as the gap it is.
          const decided = resolveSlot(run.v);
          if (decided) return <span key={key}>{decided}</span>;
          return (
            <span key={key} className="st-slot" title="not decided yet">
              {run.v}
            </span>
          );
        }
        if (run.t === 'link')
          return (
            <a key={key} href={run.href}>
              {run.v}
            </a>
          );
        return <span key={key}>{run.v}</span>;
      })}
    </>
  );
}

function One({ block }: { block: Block }) {
  switch (block.k) {
    case 'rule':
      return <hr />;
    case 'h':
      return block.level === 2 ? (
        <h2>
          <Runs runs={block.text} />
        </h2>
      ) : (
        <h3>
          <Runs runs={block.text} />
        </h3>
      );
    case 'quote':
      return (
        <blockquote>
          <Runs runs={block.text} />
        </blockquote>
      );
    case 'ul':
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={keyOf('li', i, inlineText(item))}>
              <Runs runs={item} />
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol>
          {block.items.map((item, i) => (
            <li key={keyOf('li', i, inlineText(item))}>
              <Runs runs={item} />
            </li>
          ))}
        </ol>
      );
    default:
      return isSubHeading(block) ? (
        <h2>
          <Runs runs={block.text} />
        </h2>
      ) : (
        <p>
          <Runs runs={block.text} />
        </p>
      );
  }
}

export function Prose({ blocks, className }: { blocks: readonly Block[]; className?: string }) {
  return (
    <div className={className ? `st-prose ${className}` : 'st-prose'}>
      {blocks.map((block, i) => (
        <One
          key={keyOf(block.k, i, block.k === 'ul' || block.k === 'ol' ? '' : blockText(block))}
          block={block}
        />
      ))}
    </div>
  );
}

function blockText(block: Block): string {
  return block.k === 'rule' || block.k === 'ul' || block.k === 'ol' ? '' : inlineText(block.text);
}
