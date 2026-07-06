'use client';

import { useEffect, useState } from 'react';

/** The desktop breakpoint — above this the app uses a sidebar; below, a bottom nav. */
export const DESKTOP_MIN = 960;

/** Track viewport width so the shell can lay out as a real responsive web app (not a phone). */
export function useViewport() {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? DESKTOP_MIN : window.innerWidth,
  );
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return { width, isDesktop: width >= DESKTOP_MIN };
}
