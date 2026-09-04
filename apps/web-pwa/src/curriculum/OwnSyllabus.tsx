'use client';

/**
 * "Show me my syllabus" (CURRICULUM.md §6).
 *
 * When nothing official exists — a school that writes its own scheme of work, a programme too
 * small to publish, a board whose site is down — the learner brings theirs: paste it, photograph
 * the page or the timetable, or hand over a PDF. The brain structures it into a personal
 * framework; the learner confirms it one chapter at a time; then it is theirs.
 *
 * Two laws are visible on this screen. It is labelled "drafted from your syllabus, check it" and
 * never anything stronger. And it stays private: a personal framework belongs to its learner, and
 * offering it to everyone else is a separate, explicit choice.
 */

import type { OwnFrameworkView, OwnSource } from '@wobo/sdk';
import { useRef, useState } from 'react';
import { Hairline, MagneticButton, surface } from '../ui/kit';
import { curriculum } from './client';
import { ProvenanceLabel } from './Labels';
import { LevelPicker } from './Pickers';

/** Client-side guards. The brain is the authority; these save a learner a long useless upload. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

/** The classes we can offer with no framework to ask — grades 4 to 13, school level only (§11). */
const SCHOOL_LEVELS = Array.from({ length: 10 }, (_, i) => `Class ${i + 4}`);

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('unreadable'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      // A data URL's payload is everything after the comma; the brain wants the bytes, not the URL.
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

export interface OwnSyllabusProps {
  /** Confirmed and published — the caller pins it as the learner's world. */
  onReady(framework: OwnFrameworkView): void;
  onCancel?(): void;
  /** Where they got here from, so the name field starts with what they typed. */
  suggestedName?: string;
}

export function OwnSyllabus({ onReady, onCancel, suggestedName = '' }: OwnSyllabusProps) {
  const [name, setName] = useState(suggestedName);
  const [level, setLevel] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<OwnFrameworkView | null>(null);
  const photoInput = useRef<HTMLInputElement | null>(null);
  const cameraInput = useRef<HTMLInputElement | null>(null);
  const pdfInput = useRef<HTMLInputElement | null>(null);

  const ready = name.trim().length > 1 && Boolean(level);

  const send = async (source: OwnSource) => {
    if (!level) return;
    setBusy(true);
    setError(null);
    try {
      setDraft(await curriculum().own.read(source, { name: name.trim(), level }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'I could not read that one. Try another way.');
    } finally {
      setBusy(false);
    }
  };

  const sendFile = async (file: File | null | undefined, kind: 'photo' | 'pdf') => {
    if (!file) return;
    const limit = kind === 'photo' ? MAX_IMAGE_BYTES : MAX_PDF_BYTES;
    if (file.size > limit) {
      setError(
        kind === 'photo'
          ? 'That photo is bigger than I can read. Try one page at a time.'
          : 'That file is bigger than I can read. Try the chapter list on its own.',
      );
      return;
    }
    try {
      const data = await readAsBase64(file);
      await send(
        kind === 'photo'
          ? { kind: 'photo', data, mediaType: file.type || 'image/jpeg', title: file.name }
          : { kind: 'pdf', data, title: file.name },
      );
    } catch {
      setError('I could not open that file. Try another one.');
    }
  };

  if (draft) {
    return (
      <ConfirmDraft
        draft={draft}
        onDraft={setDraft}
        onReady={onReady}
        onBack={() => setDraft(null)}
      />
    );
  }

  return (
    <section style={{ display: 'grid', gap: 14 }} aria-label="Show me your syllabus">
      <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: surface.inkSoft }}>
        Give me your chapter list however you have it and I will lay it out. You check it before we
        use it.
      </p>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: '0.84rem', color: surface.inkSoft }}>
          What do you call this syllabus?
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My school’s scheme of work"
          style={fieldStyle}
        />
      </label>

      <div style={{ display: 'grid', gap: 7 }}>
        <span style={{ fontSize: '0.84rem', color: surface.inkSoft }}>Which class is it for?</span>
        <LevelPicker levels={SCHOOL_LEVELS} level={level} onLevel={setLevel} />
      </div>

      <Hairline />

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: '0.84rem', color: surface.inkSoft }}>
          Paste or type the chapters
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={'1. Rational numbers\n2. Linear equations\n3. Quadrilaterals'}
          style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </label>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <MagneticButton
          size="sm"
          disabled={!ready || busy || text.trim().length < 12}
          onClick={() => void send({ kind: 'paste', text: text.trim() })}
        >
          Read this
        </MagneticButton>
        <MagneticButton
          variant="quiet"
          size="sm"
          disabled={!ready || busy}
          onClick={() => cameraInput.current?.click()}
        >
          Take a photo
        </MagneticButton>
        <MagneticButton
          variant="quiet"
          size="sm"
          disabled={!ready || busy}
          onClick={() => photoInput.current?.click()}
        >
          Upload a photo
        </MagneticButton>
        <MagneticButton
          variant="quiet"
          size="sm"
          disabled={!ready || busy}
          onClick={() => pdfInput.current?.click()}
        >
          Upload a PDF
        </MagneticButton>
        {onCancel && (
          <MagneticButton variant="ghost" size="sm" onClick={onCancel}>
            Back
          </MagneticButton>
        )}
      </div>

      {/* The camera door on a phone, and the plain file door everywhere. */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void sendFile(e.target.files?.[0], 'photo')}
      />
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void sendFile(e.target.files?.[0], 'photo')}
      />
      <input
        ref={pdfInput}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => void sendFile(e.target.files?.[0], 'pdf')}
      />

      <div
        role="status"
        aria-live="polite"
        style={{ minHeight: 18, fontSize: '0.82rem', color: surface.inkFaint }}
      >
        {error ?? (busy ? 'Reading it now' : '')}
      </div>

      <p style={{ margin: 0, fontSize: '0.78rem', color: surface.inkFaint }}>
        Never send pictures of people or personal information. This syllabus stays yours — nobody
        else sees it unless you offer it.
      </p>
    </section>
  );
}

function ConfirmDraft({
  draft,
  onDraft,
  onReady,
  onBack,
}: {
  draft: OwnFrameworkView;
  onDraft(next: OwnFrameworkView): void;
  onReady(framework: OwnFrameworkView): void;
  onBack(): void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const left = draft.units.filter((u) => !u.confirmed).length;

  const confirm = async (unitId: string, confirmed: boolean) => {
    setError(null);
    try {
      onDraft(await curriculum().own.confirmUnit(draft.framework.id, unitId, confirmed));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save. Try once more.');
    }
  };

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      onReady(await curriculum().own.publish(draft.framework.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save. Try once more.');
      setBusy(false);
    }
  };

  return (
    <section style={{ display: 'grid', gap: 14 }} aria-label="Check your syllabus">
      <div style={{ display: 'grid', gap: 4 }}>
        <span style={{ fontWeight: 560 }}>{draft.framework.name}</span>
        <ProvenanceLabel status="personal" label={draft.label} />
      </div>

      <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, color: surface.inkSoft }}>
        This is what I read. Tap the ones that are right; fix anything I got wrong later, in your
        subject.
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        {draft.units.map((unit) => (
          <li
            key={unit.id}
            style={{
              display: 'grid',
              gap: 4,
              padding: '10px 12px',
              background: surface.tonal,
              borderRadius: surface.radius.card,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontWeight: 540 }}>{unit.name}</span>
              <button
                type="button"
                onClick={() => void confirm(unit.id, !unit.confirmed)}
                aria-pressed={unit.confirmed}
                style={{
                  font: 'inherit',
                  fontSize: '0.78rem',
                  padding: '4px 10px',
                  border: 'none',
                  borderRadius: surface.radius.control,
                  background: unit.confirmed ? surface.ink : surface.card,
                  color: unit.confirmed ? 'var(--wobo-on-ink)' : surface.inkSoft,
                  cursor: 'pointer',
                }}
              >
                {unit.confirmed ? 'Confirmed' : 'That is right'}
              </button>
            </div>
            {unit.quote && (
              <span style={{ fontSize: '0.75rem', color: surface.inkFaint }}>
                From your page: “{unit.quote}”
              </span>
            )}
          </li>
        ))}
      </ul>

      <div
        role="status"
        aria-live="polite"
        style={{ minHeight: 18, fontSize: '0.82rem', color: surface.inkFaint }}
      >
        {error ?? (left > 0 ? `${left} left to check` : 'All checked')}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <MagneticButton size="sm" disabled={busy || left > 0} onClick={() => void publish()}>
          Use this syllabus
        </MagneticButton>
        <MagneticButton variant="quiet" size="sm" onClick={onBack}>
          Start again
        </MagneticButton>
      </div>
    </section>
  );
}

const fieldStyle: React.CSSProperties = {
  font: 'inherit',
  fontSize: '0.95rem',
  padding: '10px 12px',
  color: surface.ink,
  background: surface.card,
  borderRadius: surface.radius.control,
};
