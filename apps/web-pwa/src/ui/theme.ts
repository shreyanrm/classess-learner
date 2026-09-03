/**
 * Appearance — light / dark / system. Dark is subtle graphite (never black); the palette lives in
 * the `--wobo-*` token layer (`[data-theme="dark"]`). This module only decides which theme is live
 * and writes `data-theme` on the document root. 'system' follows prefers-color-scheme live.
 */
import { chrome, dark } from '@wobo/config';
import { useSyncExternalStore } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'wobo-theme-v1';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePref(): ThemePref {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

function resolve(pref: ThemePref): 'light' | 'dark' {
  return pref === 'system' ? (media().matches ? 'dark' : 'light') : pref;
}

/** The page colour of each theme, straight from the tokens — never a second copy of the hex. */
const PAGE: Record<'light' | 'dark', string> = {
  light: chrome.page,
  dark: dark['--wobo-page'] ?? chrome.page,
};

/**
 * Keep the browser chrome on the app's page colour.
 *
 * index.html ships two media-scoped `theme-color` tags so the very first paint is right with no JS.
 * Once the learner picks an explicit theme, those media queries are following the OS and not the
 * app, so the resolved colour is written onto both tags — the address bar then matches the theme
 * the learner actually chose.
 */
function paintChrome(theme: 'light' | 'dark') {
  const color = PAGE[theme];
  const tags = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (tags.length === 0) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = color;
    document.head.appendChild(meta);
    return;
  }
  for (const tag of tags) tag.content = color;
}

function paint(pref: ThemePref) {
  const theme = resolve(pref);
  document.documentElement.setAttribute('data-theme', theme);
  paintChrome(theme);
}

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

export function setThemePref(pref: ThemePref) {
  localStorage.setItem(KEY, pref);
  paint(pref);
  emit();
}

/** Call once at boot: paint the stored preference and keep 'system' in sync with the OS live. */
export function initTheme() {
  paint(getThemePref());
  media().addEventListener('change', () => {
    if (getThemePref() === 'system') paint('system');
  });
}

/** Reactive read of the stored preference for the settings picker. */
export function useThemePref(): ThemePref {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getThemePref,
    () => 'system',
  );
}
