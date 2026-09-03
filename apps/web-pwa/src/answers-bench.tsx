/**
 * The answer-kinds bench (`/answers-bench.html`).
 *
 * Every interactive answer kind (WOBO-PLAN.md §16), with its sample spec, at the three widths that
 * decide a layout — a phone, a tablet, a desk — in either theme, with the host's own Check button
 * beside each one and the structured result printed underneath.
 *
 * Two things this exists to prove, which a screenshot of the app could not:
 *   1. every kind is operable and legible at 360 px, not merely at 1440;
 *   2. `check` returns codes, counts and highlights — never prose — so Wobo owns the words.
 *
 * Dev only. Vite's production build has exactly one input (`index.html`), so nothing here reaches
 * a bundle a learner downloads.
 */

import '@fontsource-variable/caveat';
import '@fontsource-variable/plus-jakarta-sans';
import { fontFamily } from '@wobo/config';
import { cssVariables } from '@wobo/config/css';
import type { AnswerCheck, AnswerSpec, AnswerState } from '@wobo/contracts';
import { AnswerControl, check, resetState, SAMPLE_SPECS } from '@wobo/wobo';
import { StrictMode, useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

// --- Tokens and theme ---------------------------------------------------------------------------

const STYLE_ID = 'wobo-tokens';
if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `${cssVariables()}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--wobo-page); color: var(--wobo-ink-900); }
body { font-family: ${fontFamily.system}; }
.bench-bar { position: sticky; top: 0; z-index: 2; display: flex; gap: 24px; align-items: center;
  flex-wrap: wrap; padding: 12px 20px; background: var(--wobo-page);
  border-bottom: 1px solid var(--wobo-hairline-on-paper-strong); }
.bench-group { display: flex; gap: 8px; align-items: center; border: 0; margin: 0; padding: 0; min-width: 0; }
.bench-legend { font-size: .8rem; color: var(--wobo-ink-faint); }
.bench-tab { appearance: none; font: inherit; font-size: .85rem; cursor: pointer; padding: 6px 10px;
  border-radius: 3px; border: 1px solid var(--wobo-card-border); background: var(--wobo-card);
  color: var(--wobo-ink-900); }
.bench-tab[aria-pressed="true"] { border-color: var(--wobo-ultramarine); color: var(--wobo-ultramarine); }
.bench-list { display: flex; flex-direction: column; gap: 40px; padding: 32px 16px 96px; margin: 0 auto; }
.bench-item { width: 100%; border: 1px solid var(--wobo-card-border); border-radius: 3px;
  background: var(--wobo-card); padding: 24px; }
.bench-head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px;
  margin-bottom: 20px; }
.bench-kind { margin: 0; font-size: .8rem; letter-spacing: .04em; color: var(--wobo-ink-faint); }
.bench-check { appearance: none; font: inherit; cursor: pointer; padding: 10px 18px; min-height: 44px;
  border-radius: 3px; border: 1px solid var(--wobo-ultramarine); background: var(--wobo-ultramarine);
  color: #FFFFFF; }
.bench-check:disabled { opacity: .4; cursor: default; }
.bench-foot { display: flex; align-items: center; gap: 12px; margin-top: 20px;
  border-top: 1px solid var(--wobo-hairline-on-paper); padding-top: 16px; }
.bench-result { font-size: .8rem; color: var(--wobo-ink-faint); font-variant-numeric: tabular-nums; }
.bench-chip { display: inline-block; margin-right: 8px; padding: 2px 8px; border-radius: 3px;
  border: 1px solid var(--wobo-card-border); }
`;
  document.head.appendChild(style);
}

/** The theme is a plain attribute so a screenshot can be taken of either without app state. */
const params = new URLSearchParams(window.location.search);
const startTheme = params.get('theme') === 'dark' ? 'dark' : 'light';
document.documentElement.dataset.theme = startTheme;

// --- The bench ----------------------------------------------------------------------------------

/** A phone, a tablet, a desk. The three widths a layout is actually decided at. */
const WIDTHS = [360, 820, 1440] as const;
type Width = (typeof WIDTHS)[number];

/** The structured result, printed as it comes back. No prose is invented here either. */
function Result({ result }: { result: AnswerCheck | null }) {
  if (!result) return <span className="bench-result">not checked</span>;
  return (
    <span className="bench-result">
      <span className="bench-chip">{result.correct ? 'correct' : 'not yet'}</span>
      {result.partial !== undefined ? (
        <span className="bench-chip">partial {result.partial.toFixed(2)}</span>
      ) : null}
      {result.feedback.map((f) => (
        <span className="bench-chip" key={`${f.code}-${f.count ?? ''}-${f.actual ?? ''}`}>
          {f.code}
          {f.count !== undefined ? ` ×${f.count}` : ''}
          {f.expected !== undefined ? ` want ${f.expected}` : ''}
          {f.actual !== undefined ? ` got ${f.actual}` : ''}
        </span>
      ))}
      {result.highlight.length > 0 ? (
        <span className="bench-chip">{result.highlight.length} ringed</span>
      ) : null}
    </span>
  );
}

function Item({ spec }: { spec: AnswerSpec }) {
  const [state, setState] = useState<AnswerState>(() => resetState(spec));
  const [result, setResult] = useState<AnswerCheck | null>(null);

  const onChange = useCallback((next: AnswerState) => {
    setState(next);
    // A fresh move clears the last verdict: a ring must never outlive the thing it rang.
    setResult(null);
  }, []);

  return (
    <section className="bench-item" aria-label={spec.kind}>
      <div className="bench-head">
        <p className="bench-kind">{spec.kind.replace(/_/g, ' ')}</p>
      </div>
      <AnswerControl spec={spec} state={state} onChange={onChange} result={result} />
      <div className="bench-foot">
        {/* The host owns Check — one primary control per item, never inside the library. */}
        <button type="button" className="bench-check" onClick={() => setResult(check(spec, state))}>
          Check
        </button>
        <Result result={result} />
      </div>
    </section>
  );
}

function Bench() {
  const [width, setWidth] = useState<Width>(820);
  const [theme, setTheme] = useState<'light' | 'dark'>(startTheme);
  const specs = useMemo(() => SAMPLE_SPECS, []);

  const pickTheme = (next: 'light' | 'dark'): void => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
  };

  return (
    <>
      <div className="bench-bar">
        <span className="bench-legend">{specs.length} answer kinds</span>
        <fieldset className="bench-group" aria-label="frame width">
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              className="bench-tab"
              aria-pressed={width === w}
              onClick={() => setWidth(w)}
            >
              {w}
            </button>
          ))}
        </fieldset>
        <fieldset className="bench-group" aria-label="theme">
          {(['light', 'dark'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className="bench-tab"
              aria-pressed={theme === t}
              onClick={() => pickTheme(t)}
            >
              {t}
            </button>
          ))}
        </fieldset>
      </div>
      <div className="bench-list" style={{ maxWidth: width }}>
        {specs.map((spec: AnswerSpec) => (
          <Item key={spec.id} spec={spec} />
        ))}
      </div>
    </>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
  <StrictMode>
    <Bench />
  </StrictMode>,
);
