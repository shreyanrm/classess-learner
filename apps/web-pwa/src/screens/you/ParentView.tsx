'use client';

/**
 * The parent's view — the You page read-only, as the Sunday note links to it (WOBO-PLAN §14: "the
 * parent link shares this page read-only"). The mock in chapter 02 of
 * design/prototypes/site-parents.html is the drawing: the week's lessons, the Sunday note in
 * marigold, and the lock line. What a parent does not see is the learner's questions word for
 * word, and the page says so.
 *
 * Inside the app it is the learner's own preview, reached from the Parents card: "show mom what I
 * just cracked" starts with knowing what mom will see.
 */

import { useWoboBus } from '@wobo/wobo';
import { useEffect, useMemo, useState } from 'react';
import { useRegistryRevision } from '../../curriculum/hooks';

import { useRouter } from '../../shell/router';
import { loadMind } from '../../store/mind';
import { useProgress } from '../../store/progress';
import { AppShell, type NavId, TopBar, WoboHead } from '../../ui/primitives';
import { classLine } from '../You';
import { activityCounts, weekTopics } from './ledger';
import { boardName, loadProfile, markToday } from './profile';
import { type LessonRow, summarise, sundayNote } from './week';
import './you.css';

function Row({ lesson }: { lesson: LessonRow }) {
  const pill =
    lesson.state === 'in progress' ? (
      <span className="wy-ok wy-now">in progress</span>
    ) : lesson.state === 'mastered' ? (
      <span className="wy-ok">mastered</span>
    ) : (
      <span className="wy-ok" style={{ background: 'var(--paper-3)' }}>
        next
      </span>
    );
  return (
    <div className="wy-row">
      <div>
        <b>{lesson.name}</b>
        {lesson.subject ? <span>{lesson.subject}</span> : null}
      </div>
      {pill}
    </div>
  );
}

export function ParentView() {
  const router = useRouter();
  const bus = useWoboBus();
  const { completed, topicProgress } = useProgress();
  const revision = useRegistryRevision();
  const [profile] = useState(() => loadProfile());
  const [marks] = useState(() => markToday());
  // biome-ignore lint/correctness/useExhaustiveDependencies: the registry revision is the trigger
  const topics = useMemo(() => weekTopics(), [revision]);
  const summary = useMemo(
    () =>
      summarise({
        now: new Date(),
        span: 'week',
        marks,
        counts: activityCounts(),
        days: loadMind().days ?? {},
        topics,
        topicProgress,
        completed,
      }),
    [marks, topics, topicProgress, completed],
  );
  const firstName = profile.name.trim().split(/\s+/)[0] ?? '';
  const board = boardName(profile.boardId);
  const note = sundayNote(summary, firstName);

  useEffect(() => {
    bus.publishPage({
      route: 'parent',
      state: { name: firstName, lessons: summary.lessons.length, showedUp: summary.showedUp },
    });
  }, [bus, firstName, summary]);

  const go = (id: NavId) => {
    if (id === 'home') router.navigate({ name: 'home' });
    else if (id === 'learn') router.navigate({ name: 'learn' });
    else if (id === 'practice') router.navigate({ name: 'practice' });
    else router.navigate({ name: 'you' });
  };

  const crumb = ['You', firstName, profile.grade && classLine(profile.grade), board]
    .filter(Boolean)
    .join(' · ');

  return (
    <AppShell active="you" className="wy-shell" onNavigate={go}>
      <TopBar crumb={crumb} />
      <div className="wy-art wy-lilac" style={{ maxWidth: 640 }}>
        <div className="wy-mock">
          <div className="wy-top">
            <WoboHead size={32} />
            <b>{firstName}</b>
            {[profile.grade && classLine(profile.grade), board, 'this week']
              .filter(Boolean)
              .join(' · ')}
          </div>
          {summary.lessons.map((lesson) => (
            <Row key={lesson.id} lesson={lesson} />
          ))}
          <div className="wy-note">
            {note.map((seg, i) =>
              seg.em ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: the segments are a fixed sentence
                <em key={i}>{seg.text}</em>
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: the segments are a fixed sentence
                <span key={i}>{seg.text}</span>
              ),
            )}
          </div>
          <div className="wy-lock">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="10" width="14" height="10" rx="3" />
              <path d="M8 10 v-3 a4 4 0 0 1 8 0 v3" />
            </svg>
            Questions word for word: shared only if {firstName || profile.name} allows
          </div>
        </div>
      </div>
    </AppShell>
  );
}
