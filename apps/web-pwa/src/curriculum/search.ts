/**
 * Type-ahead over the registry (CURRICULUM.md §3).
 *
 * A learner types a board name a character at a time; the registry is a network call. This runner
 * is the small amount of care that sits between them: it waits for a pause before asking, it never
 * lets a slow earlier answer overwrite a fast later one, and it keeps the "not listed? tell me"
 * door on every state — including the failed one, because a registry that is down is exactly when
 * the learner most needs the other door.
 *
 * Pure and timer-injected, so the debounce is tested rather than hoped for.
 */

import { type CurriculumSearchResult, NOT_LISTED_FALLBACK } from '@wobo/sdk';

export type SearchStatus = 'idle' | 'typing' | 'searching' | 'done' | 'failed';

export interface SearchState {
  query: string;
  status: SearchStatus;
  result: CurriculumSearchResult | null;
  /** Wobo's line when the registry could not answer. Never a status code. */
  error: string | null;
}

export const IDLE_SEARCH: SearchState = { query: '', status: 'idle', result: null, error: null };

/** The always-open door, whatever the state — matched, empty, or failed. */
export function notListedMessage(state: SearchState): string {
  return state.result?.notListed.message ?? NOT_LISTED_FALLBACK;
}

export interface Timer {
  set(fn: () => void, ms: number): number;
  clear(handle: number): void;
}

const realTimer: Timer = {
  set: (fn, ms) => setTimeout(fn, ms) as unknown as number,
  clear: (handle) => clearTimeout(handle),
};

export interface SearchRunnerOptions {
  search(query: string): Promise<CurriculumSearchResult>;
  onState(state: SearchState): void;
  /** How long a learner has to stop typing before we ask. */
  delay?: number;
  /** Wobo's line when the registry is unreachable. */
  failure?: string;
  timer?: Timer;
}

export interface SearchRunner {
  /** Called on every keystroke. Blank clears back to idle without a call. */
  query(text: string): void;
  /** Ask now, skipping the wait — the Enter key. */
  flush(): void;
  /** Stop waiting and forget any answer still in flight. */
  cancel(): void;
}

export const SEARCH_DELAY_MS = 220;
const FAILURE = 'I could not reach my list of boards just now. Try again in a moment.';

export function createSearchRunner(options: SearchRunnerOptions): SearchRunner {
  const timer = options.timer ?? realTimer;
  const delay = options.delay ?? SEARCH_DELAY_MS;
  const failure = options.failure ?? FAILURE;

  let handle: number | null = null;
  let sequence = 0;
  let pending = '';
  let state = IDLE_SEARCH;

  const emit = (next: SearchState) => {
    state = next;
    options.onState(state);
  };

  const stopTimer = () => {
    if (handle !== null) timer.clear(handle);
    handle = null;
  };

  const run = (text: string) => {
    const mine = ++sequence;
    emit({ query: text, status: 'searching', result: state.result, error: null });
    options.search(text).then(
      (result) => {
        // A slower earlier keystroke must never overwrite a later answer.
        if (mine !== sequence) return;
        emit({ query: text, status: 'done', result, error: null });
      },
      () => {
        if (mine !== sequence) return;
        emit({ query: text, status: 'failed', result: null, error: failure });
      },
    );
  };

  return {
    query(text) {
      const trimmed = text.trim();
      pending = trimmed;
      stopTimer();
      if (!trimmed) {
        // Blank box: no call, no stale results, and the door still open.
        sequence++;
        emit(IDLE_SEARCH);
        return;
      }
      emit({ query: trimmed, status: 'typing', result: state.result, error: null });
      handle = timer.set(() => {
        handle = null;
        run(trimmed);
      }, delay);
    },
    flush() {
      stopTimer();
      if (pending) run(pending);
    },
    cancel() {
      stopTimer();
      sequence++;
      emit(IDLE_SEARCH);
    },
  };
}

/**
 * The learner's country, hinted from the browser's locale (§3). A hint only — the brain uses it as
 * a tie-break and never as a filter, so a wrong guess costs an Indian family abroad nothing.
 */
export function countryHint(locales?: readonly string[]): string | null {
  const candidates =
    locales ??
    (typeof navigator === 'undefined'
      ? []
      : ((navigator.languages as readonly string[] | undefined) ??
        (navigator.language ? [navigator.language] : [])));
  for (const locale of candidates) {
    const region = regionOf(locale);
    if (region) return region;
  }
  return null;
}

function regionOf(locale: string): string | null {
  try {
    const resolved = new Intl.Locale(locale).maximize().region;
    if (resolved) return resolved.toUpperCase();
  } catch {
    // an environment without Intl.Locale, or a locale string it will not parse
  }
  const match = locale.match(/[-_]([A-Za-z]{2})\b/);
  return match?.[1] ? match[1].toUpperCase() : null;
}
