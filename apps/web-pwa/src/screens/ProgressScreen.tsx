'use client';

/**
 * Progress is not a screen of its own — progress IS the You screen (board 05 of
 * design/prototypes/app-v1.html: "You · progress, parents, settings"). The week in Wobo's words,
 * the activity chart, the learning strengths and the parent's view all live there, behind the
 * fourth door, where a learner already goes to look at themselves.
 *
 * `/progress` therefore keeps its address and hands it over: every old link, bookmark, palette
 * entry and Wobo navigation lands on `/you`, and the span the old screen showed (week · month ·
 * year) is the segmented control in that screen's top bar. The replace is deliberate — the
 * learner's back button must not bounce them through a page that no longer exists.
 */

import { useEffect } from 'react';
import { useRouter } from '../shell/router';

export function ProgressScreen() {
  const { replace } = useRouter();
  useEffect(() => {
    replace({ name: 'you' });
  }, [replace]);
  // One frame of plain paper while the address hands over — never a cold skeleton, never a flash.
  return <div style={{ height: '100dvh', background: 'var(--paper)' }} />;
}
