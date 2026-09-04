'use client';

/**
 * The learner's edits, on top of the canonical syllabus (CURRICULUM.md §6).
 *
 * Six moves: add, remove, rename, reorder, "not in my school", attach a textbook. None of them
 * touches the published version — each becomes an operation keyed by the canonical node id, so a
 * new academic year re-applies them and reports what no longer matches.
 *
 * "Not in my school" dims a chapter rather than deleting it, because the board still teaches it
 * and the learner may want it back. Removing is the learner's own list; the source stays true.
 */

import { type CurriculumNode, type CurriculumNodeKind, moveWithin, overlayOps } from '@wobo/sdk';
import { useState } from 'react';
import { Hairline, MagneticButton, surface } from '../ui/kit';
import { useOverlayOps } from './hooks';
import { SourceNote } from './Labels';

export interface OverlayEditorProps {
  /** The nodes as the learner currently sees them (canonical, with the overlay already applied). */
  nodes: CurriculumNode[];
  /** The node the list hangs from — a subject for chapters, a chapter for topics. */
  parentId: string;
  /** What is being edited, for the copy and for `add`. */
  kind: Extract<CurriculumNodeKind, 'unit' | 'topic'>;
  onClose?(): void;
}

const WORD: Record<'unit' | 'topic', { one: string; many: string }> = {
  unit: { one: 'chapter', many: 'chapters' },
  topic: { one: 'topic', many: 'topics' },
};

export function OverlayEditor({ nodes, parentId, kind, onClose }: OverlayEditorProps) {
  const overlay = useOverlayOps();
  const [adding, setAdding] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [textbookFor, setTextbookFor] = useState<string | null>(null);
  const [textbookTitle, setTextbookTitle] = useState('');
  const word = WORD[kind];

  const siblings = nodes.filter((n) => n.parentId === parentId);
  const list = siblings.length > 0 ? siblings : nodes;

  const move = (nodeId: string, delta: number) => {
    const op = moveWithin(list, list[0]?.parentId ?? parentId, nodeId, delta);
    if (op) overlay.apply(op);
  };

  return (
    <section style={{ display: 'grid', gap: 12 }} aria-label={`Edit your ${word.many}`}>
      <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.5, color: surface.inkSoft }}>
        Make this list match your school. Your changes sit on top of the official {word.many} and
        come with you when the board publishes a new year.
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        {list.map((node, i) => (
          <li
            key={node.id}
            style={{
              display: 'grid',
              gap: 6,
              padding: '10px 12px',
              background: surface.tonal,
              borderRadius: surface.radius.card,
              opacity: node.notInMySchool ? 0.55 : 1,
            }}
          >
            {renaming === node.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = draftName.trim();
                  if (name && name !== node.name) overlay.apply(overlayOps.rename(node.id, name));
                  setRenaming(null);
                }}
                style={{ display: 'flex', gap: 6 }}
              >
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  aria-label={`New name for ${node.name}`}
                  style={inputStyle}
                />
                <MagneticButton size="sm">Save</MagneticButton>
                <MagneticButton variant="quiet" size="sm" onClick={() => setRenaming(null)}>
                  Cancel
                </MagneticButton>
              </form>
            ) : (
              <div style={{ display: 'grid', gap: 2 }}>
                <span style={{ fontWeight: 540 }}>{node.name}</span>
                <SourceNote sourceRef={node.sourceRef} own={node.own} />
                {node.renamedFrom && (
                  <span style={{ fontSize: '0.75rem', color: surface.inkFaint }}>
                    You renamed this from “{node.renamedFrom}”
                  </span>
                )}
                {node.textbook && (
                  <span style={{ fontSize: '0.75rem', color: surface.inkFaint }}>
                    Your textbook: {node.textbook.title}
                  </span>
                )}
                {node.notInMySchool && (
                  <span style={{ fontSize: '0.75rem', color: surface.inkFaint }}>
                    Not taught in your school
                  </span>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tiny label="Move up" disabled={i === 0} onClick={() => move(node.id, -1)} />
              <Tiny
                label="Move down"
                disabled={i === list.length - 1}
                onClick={() => move(node.id, 1)}
              />
              <Tiny
                label="Rename"
                onClick={() => {
                  setRenaming(node.id);
                  setDraftName(node.name);
                }}
              />
              <Tiny
                label={node.notInMySchool ? 'We do study this' : 'Not in my school'}
                onClick={() =>
                  overlay.apply(overlayOps.notInMySchool(node.id, !node.notInMySchool))
                }
              />
              <Tiny label="Attach a textbook" onClick={() => setTextbookFor(node.id)} />
              <Tiny label="Remove" onClick={() => overlay.apply(overlayOps.remove(node.id))} />
            </div>

            {textbookFor === node.id && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const title = textbookTitle.trim();
                  if (title) overlay.apply(overlayOps.attachTextbook(node.id, { title }));
                  setTextbookFor(null);
                  setTextbookTitle('');
                }}
                style={{ display: 'flex', gap: 6 }}
              >
                <input
                  type="text"
                  value={textbookTitle}
                  onChange={(e) => setTextbookTitle(e.target.value)}
                  placeholder="The book you use"
                  aria-label={`Textbook for ${node.name}`}
                  style={inputStyle}
                />
                <MagneticButton size="sm">Attach</MagneticButton>
              </form>
            )}
          </li>
        ))}
      </ul>

      <Hairline />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = adding.trim();
          if (!name) return;
          overlay.apply(
            overlayOps.add(list[0]?.parentId ?? parentId, kind, name, list.at(-1)?.id ?? null),
          );
          setAdding('');
        }}
        style={{ display: 'flex', gap: 6 }}
      >
        <input
          type="text"
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder={`A ${word.one} your school adds`}
          aria-label={`Add a ${word.one}`}
          style={inputStyle}
        />
        <MagneticButton size="sm" disabled={!adding.trim()}>
          Add
        </MagneticButton>
      </form>

      <div
        role="status"
        aria-live="polite"
        style={{ minHeight: 16, fontSize: '0.78rem', color: surface.inkFaint }}
      >
        {overlay.error ?? (overlay.saving ? 'Saving your changes' : '')}
      </div>

      {overlay.report.length > 0 && (
        <div style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: '0.8rem', color: surface.inkSoft }}>
            From the last time your board updated:
          </span>
          {overlay.report.map((line) => (
            <span key={line} style={{ fontSize: '0.78rem', color: surface.inkFaint }}>
              {line}
            </span>
          ))}
        </div>
      )}

      {onClose && (
        <div>
          <MagneticButton variant="quiet" size="sm" onClick={onClose}>
            Done
          </MagneticButton>
        </div>
      )}
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  font: 'inherit',
  fontSize: '0.9rem',
  padding: '8px 10px',
  color: surface.ink,
  background: surface.card,
  borderRadius: surface.radius.control,
};

function Tiny({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        font: 'inherit',
        fontSize: '0.76rem',
        padding: '5px 9px',
        color: disabled ? surface.inkFaint : surface.inkSoft,
        background: surface.card,
        borderRadius: surface.radius.control,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}
