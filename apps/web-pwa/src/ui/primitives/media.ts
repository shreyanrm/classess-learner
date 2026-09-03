import { useCallback, useSyncExternalStore } from 'react';

/** The prototype's one breakpoint: at 900px and under the rail becomes the bottom tab bar. */
export const PHONE_QUERY = '(max-width: 900px)';

const NONE = () => undefined;

/** True while the document matches the query; false wherever there is no window to ask. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return NONE;
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  const read = useCallback(
    () =>
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : false,
    [query],
  );
  return useSyncExternalStore(subscribe, read, () => false);
}

/** Whether the shell is in its phone layout — the same line the stylesheet draws it on. */
export function usePhone(): boolean {
  return useMediaQuery(PHONE_QUERY);
}
