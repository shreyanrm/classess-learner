/**
 * The character bench (`/body-bench.html`).
 *
 * Every face, every body track, every scene, the boot loader and the living wordmark, on one page,
 * in either theme, with nothing else booted. A rig you cannot see all of at once is a rig nobody can
 * make a taste call on — this page exists so the owner can.
 *
 * Dev and proofs only. Vite's production build has exactly one input (`index.html`), so this entry
 * never reaches a bundle a learner downloads.
 */

import '@fontsource-variable/caveat';
import '@fontsource-variable/plus-jakarta-sans';
import { fontFamily } from '@wobo/config';
import { cssVariables } from '@wobo/config/css';
import {
  BEHAVIOUR_NAMES,
  displayName,
  EXPRESSION_NAMES,
  expressionNote,
  SCENE_NAMES,
  sceneNote,
  sceneSpec,
  type WoboBehaviour,
  WoboBody,
  type WoboExpression,
  WoboLoader,
  type WoboScene,
  WoboWordmark,
} from '@wobo/wobo';
import { type ReactNode, StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

const STYLE_ID = 'wobo-tokens';
if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `${cssVariables()}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--wobo-page); color: var(--wobo-ink-900); }
body { font-family: ${fontFamily.system}; }
`;
  document.head.appendChild(style);
}

// The theme is a plain attribute so a proof can screenshot both without touching app state.
const params = new URLSearchParams(window.location.search);
const theme = params.get('theme');
if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme;

const hair = '0.5px solid color-mix(in srgb, currentColor 18%, transparent)';
const cellStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  gap: 6,
  padding: '18px 8px 14px',
};
const captionStyle = {
  fontSize: 11,
  letterSpacing: '0.01em',
  opacity: 0.62,
  textAlign: 'center' as const,
};
const noteStyle = { fontSize: 11, opacity: 0.4, fontStyle: 'italic' as const, minHeight: 14 };
/**
 * The contact sheets are laid out row by row rather than as one `auto-fill` grid, and the hairline
 * belongs to the ROW.
 *
 * With the rule on each cell, the last row of a sheet — four cells out of six, six out of eight —
 * drew a line that stopped in the middle of the page, which is the sort of thing a bench teaches
 * you to stop seeing. A row owns its own full-width rule, so every rule spans the sheet whether the
 * row is full or not.
 */
const COLUMNS = 6;
const rowStyle = {
  borderTop: hair,
  display: 'grid',
  gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
};

/** Chop a list into rows of `COLUMNS`. */
function rows<T>(items: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += COLUMNS) out.push(items.slice(i, i + COLUMNS));
  return out;
}

/** One contact sheet: full-width rules, and every cell the same height whatever it carries. */
function Sheet<T>({ items, cell }: { items: readonly T[]; cell: (item: T) => ReactNode }) {
  return (
    <div>
      {rows(items).map((row) => (
        <div key={String(row[0])} style={rowStyle}>
          {row.map((item) => (
            <div key={String(item)} style={cellStyle}>
              {cell(item)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
const buttonStyle = {
  font: 'inherit',
  fontSize: 12,
  padding: '7px 12px',
  border: hair,
  borderRadius: 3,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
};

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</h2>
        {hint ? <span style={{ fontSize: 12, opacity: 0.45 }}>{hint}</span> : null}
      </header>
      {children}
    </section>
  );
}

function BodyBench() {
  const [behaviour, setBehaviour] = useState<WoboBehaviour | null>(null);
  const [behaviourKey, setBehaviourKey] = useState(0);
  const [scene, setScene] = useState<WoboScene | null>(null);
  const [sceneKey, setSceneKey] = useState(0);
  const [loaderKey, setLoaderKey] = useState(0);
  const [loaderDone, setLoaderDone] = useState(false);

  return (
    <main
      style={{
        maxWidth: 1080,
        margin: '0 auto',
        padding: '48px 28px 120px',
        // Sentence case, no emoji, no exclamation marks — the bench obeys the same copy law.
        lineHeight: 1.45,
      }}
    >
      <header style={{ marginBottom: 44, display: 'grid', gap: 14 }}>
        <WoboWordmark height={34} />
        <p style={{ fontSize: 13, opacity: 0.5, margin: 0, maxWidth: 620 }}>
          Every face, every body track, every scene, the boot loader and the living wordmark. Add
          <code style={{ opacity: 0.8 }}> ?theme=dark </code>
          to the address to see the other half.
        </p>
      </header>

      <Section title="The boot loader" hint="a pen draws the first hairline, then Wobo settles in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingTop: 8 }}>
          <WoboLoader
            key={loaderKey}
            width={260}
            onDone={() => {
              setLoaderDone(true);
            }}
          />
          <button
            type="button"
            style={buttonStyle}
            onClick={() => {
              setLoaderDone(false);
              setLoaderKey((k) => k + 1);
            }}
          >
            Replay
          </button>
          <span style={{ ...noteStyle, minHeight: 0 }}>{loaderDone ? 'Done' : 'Running'}</span>
        </div>
      </Section>

      <Section title="The wordmark" hint="the two o's are eyes — they blink and follow the cursor">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 36, paddingTop: 8 }}>
          <WoboWordmark height={22} />
          <WoboWordmark height={40} />
          <WoboWordmark height={72} />
          <WoboWordmark height={40} follow={false} />
        </div>
      </Section>

      <Section title="Scenes" hint="cued by name — this is what a board action plays">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {SCENE_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              style={{
                ...buttonStyle,
                borderColor: scene === name ? 'var(--wobo-ultramarine)' : undefined,
              }}
              onClick={() => {
                setScene(name);
                setSceneKey((k) => k + 1);
              }}
            >
              {displayName(name)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <WoboBody size={148} scene={scene} sceneKey={sceneKey} onTap={() => undefined} />
          <div style={{ fontSize: 12, opacity: 0.55, display: 'grid', gap: 4, paddingTop: 12 }}>
            <div>
              {scene
                ? `${displayName(scene)} — ${sceneSpec(scene).cue}, ${sceneSpec(scene).dur} ms`
                : 'Pick a scene'}
            </div>
            <div style={noteStyle}>{scene ? sceneNote(scene) : ''}</div>
            <div style={{ opacity: 0.5 }}>
              {scene
                ? sceneSpec(scene)
                    .beats.map(
                      (b) =>
                        `${b.at}: ${[b.expression, b.behaviour]
                          .filter(Boolean)
                          .map((n) => displayName(String(n)))
                          .join(' + ')}`,
                    )
                    .join('   ·   ')
                : ''}
            </div>
            <div style={{ opacity: 0.5, marginTop: 8 }}>
              Hover Wobo for the brighten and the lean; tap for the bounce and the wink.
            </div>
          </div>
        </div>
      </Section>

      <Section title="Expressions" hint={`${EXPRESSION_NAMES.length} faces, at rest`}>
        <Sheet
          items={EXPRESSION_NAMES}
          cell={(name: WoboExpression) => (
            <>
              <WoboBody size={92} mood={name} />
              <div style={captionStyle}>{displayName(name)}</div>
              <div style={noteStyle}>{expressionNote(name)}</div>
            </>
          )}
        />
      </Section>

      <Section
        title="Scenes at rest"
        hint="the face each scene leaves Wobo wearing — the contact sheet"
      >
        <Sheet
          items={SCENE_NAMES}
          cell={(name: WoboScene) => {
            const spec = sceneSpec(name);
            const settled = [...spec.beats].reverse().find((b) => b.expression)?.expression;
            return (
              <>
                <WoboBody size={92} mood={settled} />
                <div style={captionStyle}>{displayName(name)}</div>
                <div style={noteStyle}>{spec.note}</div>
              </>
            );
          }}
        />
      </Section>

      <Section
        title="Behaviours"
        hint={`${BEHAVIOUR_NAMES.length} body tracks — tap one to play it`}
      >
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <WoboBody size={148} behaviour={behaviour} behaviourKey={behaviourKey} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 640 }}>
            {BEHAVIOUR_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                style={{
                  ...buttonStyle,
                  borderColor: behaviour === name ? 'var(--wobo-ultramarine)' : undefined,
                }}
                onClick={() => {
                  setBehaviour(name);
                  setBehaviourKey((k) => k + 1);
                }}
              >
                {displayName(name)}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section
        title="Idle life"
        hint="leave the page alone: a glance at 4 s, bored at 12 s, a yawn at 20 s, dozing at 35 s"
      >
        <div style={{ display: 'flex', gap: 40, paddingTop: 8 }}>
          <WoboBody size={112} idleSince={Date.now() - 1_000} />
          <WoboBody size={112} night={true} idleSince={Date.now() - 60_000} />
          <WoboBody size={112} draggable onTap={() => undefined} />
        </div>
      </Section>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
  <StrictMode>
    <BodyBench />
  </StrictMode>,
);
