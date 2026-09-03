/**
 * The two device-side inputs the week's arithmetic (`week.ts`) needs and that three screens read
 * the same way: the awards-per-day counter the progress store keeps, and the course map in
 * syllabus order with each topic's subject named. One reading, so the home, the You screen and the
 * parent's view can never count the same week three different ways.
 */

import { chapterById, loadedTopics, subjectById } from '../../curriculum/registry';
import type { WeekTopic } from './week';

/** The awards-per-day counter the progress store keeps. */
export function activityCounts(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem('wobo-activity-counts-v1') ?? '{}');
    return raw && typeof raw === 'object' ? (raw as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** The course map in syllabus order, each topic with its subject's name. */
export function weekTopics(): WeekTopic[] {
  return loadedTopics().map((t) => {
    const chapter = chapterById(t.chapterId);
    const subject = chapter ? subjectById(chapter.subjectId) : undefined;
    return { id: t.id, name: t.name, chapterId: t.chapterId, subject: subject?.name ?? '' };
  });
}
