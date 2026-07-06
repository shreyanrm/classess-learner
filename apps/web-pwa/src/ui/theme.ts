/**
 * Appearance — light / dark / system. Dark is subtle graphite (never black); the palette lives in
 * the `--clss-*` token layer (`[data-theme="dark"]`). This module only decides which theme is live
 * and writes `data-theme` on the document root. 'system' follows prefers-color-scheme live.
 */
import { useSyncExternalStore } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'clss-theme-v1';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePref(): ThemePref {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

function resolve(pref: ThemePref): 'light' | 'dark' {
  return pref === 'system' ? (media().matches ? 'dark' : 'light') : pref;
}

function paint(pref: ThemePref) {
  document.documentElement.setAttribute('data-theme', resolve(pref));
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
