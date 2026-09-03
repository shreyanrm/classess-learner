/**
 * The token layer is a port of design/prototypes/app-v1.html, character for character. These
 * tests hold src/ui/tokens.css to that file, so a "tidier" value can never drift in: the two
 * :root blocks at the top of the prototype are the two blocks here, in both stamps.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cssVariables } from '@wobo/config/css';
import { LEGACY_TOKEN_BRIDGE, LEGACY_TOKENS_KEPT, PAGE } from './tokens';

const REPO = join(import.meta.dir, '..', '..', '..', '..');
const PROTOTYPE = readFileSync(join(REPO, 'design', 'prototypes', 'app-v1.html'), 'utf8');
const TOKENS = readFileSync(join(import.meta.dir, 'tokens.css'), 'utf8');

/** The declarations of the first `selector{...}` block in `css`, as `name:value` strings. */
function block(css: string, selector: string): string[] {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`no block for ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css
    .slice(open + 1, close)
    .split(';')
    .map((d) => d.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((d) => d.replace(/\s*:\s*/, ':'));
}

const SPACING = ['--s1:8px', '--s2:16px', '--s3:24px', '--s4:40px', '--s5:64px', '--s6:120px'];

describe('palette v4 tokens are the prototype’s, character for character', () => {
  const protoLight = block(PROTOTYPE, ':root{');
  const protoDark = block(PROTOTYPE, '[data-theme="dark"]{');

  it('reads the prototype’s two blocks', () => {
    expect(protoLight.length).toBeGreaterThan(20);
    expect(protoDark.length).toBeGreaterThan(20);
    expect(protoLight).toContain('--paper:#FAF7F0');
    expect(protoDark).toContain('--paper:#0F1226');
  });

  it('carries every light declaration, stamped as the default and as [data-theme="light"]', () => {
    const mine = block(TOKENS, ':root,[data-theme="light"]{');
    for (const d of protoLight) expect(mine).toContain(d);
    // the only additions are the spacing scale the site pages define alongside the same palette
    for (const d of mine) expect([...protoLight, ...SPACING]).toContain(d);
  });

  it('carries every night declaration, stamped as [data-theme="dark"]', () => {
    const mine = block(TOKENS, '[data-theme="dark"]{');
    expect(mine.sort()).toEqual([...protoDark].sort());
  });

  it('follows prefers-color-scheme for a document nobody has stamped', () => {
    const media = TOKENS.indexOf('@media (prefers-color-scheme:dark)');
    expect(media).toBeGreaterThan(0);
    const mine = block(TOKENS.slice(media), ':root:not([data-theme="light"]){');
    expect(mine.sort()).toEqual([...protoDark].sort());
  });

  it('names the page colours the same in code', () => {
    expect(protoLight).toContain(`--paper:${PAGE.light}`);
    expect(protoDark).toContain(`--paper:${PAGE.dark}`);
  });

  it('sets only the two faces, self-hosted', () => {
    const faces = [...TOKENS.matchAll(/@font-face\{font-family:'([^']+)'/g)].map((m) => m[1]);
    expect(new Set(faces)).toEqual(new Set(['Poppins', 'Caveat']));
    expect(TOKENS).not.toMatch(/https?:\/\//);
    expect(TOKENS).toContain("--sans:'Poppins',system-ui,-apple-system,sans-serif");
    expect(TOKENS).toContain("--hand:'Caveat',cursive");
  });

  it('carries the prototype’s base for the page itself', () => {
    expect(TOKENS).toContain(
      'body{margin:0;background:var(--paper);color:var(--ink);font:400 16px/1.55 var(--sans);-webkit-font-smoothing:antialiased}',
    );
    expect(TOKENS).toContain('h1,h2,h3{margin:0;letter-spacing:-.02em}');
    expect(TOKENS).toContain('.hand{font-family:var(--hand);font-weight:600}');
  });
});

describe('the bridge lays the older --wobo-* layer onto palette v4', () => {
  const legacy = cssVariables();
  const names = new Set([...legacy.matchAll(/(--wobo-[\w-]+):/g)].map((m) => m[1] as string));
  const colourish = (name: string) => {
    const values = [...legacy.matchAll(new RegExp(`${name}: ([^;]+);`, 'g'))].map((m) => m[1]);
    return values.some((v) => /#[0-9a-f]{3,8}|rgba?\(|gradient\(/i.test(v ?? ''));
  };
  const bridged = new Set(
    [...LEGACY_TOKEN_BRIDGE.matchAll(/(--wobo-[\w-]+):/g)].map((m) => m[1] as string),
  );

  it('re-points every colour token the older layer emits, or names why it is kept', () => {
    for (const name of names) {
      if (!colourish(name)) continue;
      const covered = bridged.has(name) || LEGACY_TOKENS_KEPT.includes(name);
      expect([name, covered]).toEqual([name, true]);
    }
  });

  it('only ever points at a palette v4 token — never a hex of its own', () => {
    for (const line of LEGACY_TOKEN_BRIDGE.split('\n')) {
      const m = line.match(/--wobo-[\w-]+:\s*(.+);/);
      if (!m) continue;
      expect(m[1]).toMatch(/^var\(--[\w-]+\)$/);
    }
  });

  it('bridges nothing the older layer does not have', () => {
    for (const name of bridged) expect([name, names.has(name)]).toEqual([name, true]);
  });
});
