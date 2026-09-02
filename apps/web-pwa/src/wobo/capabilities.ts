/**
 * Wobo's capability registry — her governed hands in the product (WOBO.md §4). She never
 * navigates or acts directly from a model reply: the orchestrator's action path names a
 * capability here, and the permission ladder decides how it runs:
 *
 *   recommend → prepare → execute_with_permission → safe_automatic
 *
 * execute_with_permission renders an inline approval card (approve / not now) before anything
 * happens; safe_automatic runs on its own but is still shown, explained, and recorded. Every
 * outcome — taken or ignored — lands on the event backbone as wobo.offer.outcome.v1.
 */

import type { Sdk } from '@classess/sdk';
import { chaptersBySubject, topicById } from '../data/catalog';
import type { Topic } from '../data/model';
import type { Router } from '../shell/router';
import { clearMind } from '../store/mind';
import type { ActionAttachment } from './paths/types';

export type PermissionRung = 'recommend' | 'prepare' | 'execute_with_permission' | 'safe_automatic';

export type CapabilityId =
  | 'open_course'
  | 'start_practice'
  | 'start_boss'
  | 'go_to_twin'
  | 'prepare_parent_note'
  | 'forget_all';

export interface CapabilityContext {
  router: Router;
  sdk: Sdk;
}

export interface WoboCapability {
  id: CapabilityId;
  rung: PermissionRung;
  /** What the approval button offers, e.g. "open Linear equations". */
  label: (params: Record<string, unknown>) => string;
  /** Executes; returns her one-line account of what happened. */
  run: (ctx: CapabilityContext, params: Record<string, unknown>) => Promise<string>;
}

/** The atom — the one fully proven course; the default stage when no query resolves. */
const ATOM_TOPIC_ID = 'm2-1';

/** Resolve a free-text course/topic query against the catalog: id first, then name substring. */
export function findTopic(query: string): Topic | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const direct = topicById(q);
  if (direct) return direct;
  for (const chapters of Object.values(chaptersBySubject)) {
    for (const chapter of chapters) {
      for (const topic of chapter.topics) {
        if (topic.name.toLowerCase().includes(q)) return topic;
      }
    }
  }
  return undefined;
}

const resolveTopic = (params: Record<string, unknown>): Topic | undefined =>
  findTopic(String(params.query ?? '')) ?? topicById(ATOM_TOPIC_ID);

const CAPABILITIES: Record<CapabilityId, WoboCapability> = {
  open_course: {
    id: 'open_course',
    rung: 'execute_with_permission',
    label: (p) => {
      const query = String(p.query ?? '').trim();
      const found = findTopic(query);
      if (found) return `open ${found.name}`;
      return query ? `compose a course on ${query}` : 'open the course';
    },
    // A learner can ask for anything — in-syllabus opens the catalog topic; out-of-syllabus
    // composes a fresh course for exactly what they named (Course reads the `custom:` prefix).
    run: async ({ router }, p) => {
      const query = String(p.query ?? '').trim();
      const found = findTopic(query);
      if (found) {
        router.navigate({ name: 'course', topicId: found.id });
        return `We are in ${found.name} — I am right here with you.`;
      }
      if (query) {
        router.navigate({ name: 'course', topicId: `custom:${query}` });
        return `Nothing in the syllabus matched that one — so I am dreaming up a fresh course on ${query}, just for you. Give me a moment.`;
      }
      router.navigate({ name: 'course', topicId: ATOM_TOPIC_ID });
      return 'Let us start where the whole idea clicks — I am right here with you.';
    },
  },

  start_practice: {
    id: 'start_practice',
    rung: 'execute_with_permission',
    label: () => 'start practice',
    run: async ({ router }) => {
      router.navigate({ name: 'practice' });
      return 'practice is open — no hints from me this time, so every answer counts as the real thing.';
    },
  },

  start_boss: {
    id: 'start_boss',
    rung: 'execute_with_permission',
    label: (p) => {
      const topic = resolveTopic(p);
      return topic ? `face the ${topic.name} boss` : 'start the boss';
    },
    run: async ({ router }, p) => {
      const topic = resolveTopic(p);
      if (!topic)
        return 'no boss to face just yet — open a course, and one will be waiting at the finish.';
      // land the journey at the boss door (the course player resumes from this position)
      try {
        const key = 'clss-course-pos-v1';
        const pos = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, string>;
        pos[topic.id] = 'bossdoor';
        localStorage.setItem(key, JSON.stringify(pos));
      } catch {
        // position is a nicety; the course still opens
      }
      router.navigate({ name: 'course', topicId: topic.id });
      return `the boss door for ${topic.name} is open. take a breath, then step in.`;
    },
  },

  go_to_twin: {
    id: 'go_to_twin',
    // showing the learner their own map is reversible and harmless — she just does it
    rung: 'safe_automatic',
    label: () => 'open your knowledge twin',
    run: async ({ router }) => {
      router.navigate({ name: 'progress' });
      return 'your twin is up — lit is independent, dim still leans on support.';
    },
  },

  forget_all: {
    id: 'forget_all',
    // The whole memory, gone, with nothing to undo it — the most destructive thing she can do to
    // the learner's world. A model reply saying "forget everything" is never enough on its own: the
    // card asks in the thread, and the wipe happens on approval alone (WOBO.md §4, family E).
    rung: 'execute_with_permission',
    label: () => 'forget everything she knows about you',
    run: async () => {
      clearMind();
      // MindObserver republishes the (now empty) dossier on its next pulse, so her very next turn
      // reasons from a blank slate — no stale context surviving the erase.
      return 'Done — I cleared everything I was keeping about you. We start fresh from here.';
    },
  },

  prepare_parent_note: {
    id: 'prepare_parent_note',
    // it communicates beyond the learner — always explicit approval (WOBO.md §4)
    rung: 'execute_with_permission',
    label: () => 'prepare the parent note',
    run: async ({ sdk }) => {
      const res = await sdk.llm.invoke(
        'generate.digest',
        { audience: 'parent', tone: 'pride_first' },
        { consentTier: 'un_elevated' },
      );
      const out = res.output as { summary?: unknown };
      const note =
        typeof out.summary === 'string' && out.summary
          ? out.summary
          : 'a short note leading with what went well this week.';
      return `here is what I prepared — ${note} nothing is sent until you share it yourself.`;
    },
  },
};

/**
 * The confirm card for a whole-memory wipe. She says her line; this rides under it as the approval
 * card, so nothing is erased until the learner taps approve (or walks away and it stays offered).
 */
export function forgetAllOffer(offerId: string): ActionAttachment {
  return {
    capability: 'forget_all',
    params: {},
    why: 'You asked me to forget everything I know about you.',
    evidence: [
      'this clears your whole memory page — preferences, facts, the twin marks',
      'it cannot be undone, and I will not have it back',
    ],
    confidence: 'high',
    offerId,
    status: 'offered',
  };
}

export const CAPABILITY_IDS: ReadonlySet<string> = new Set(Object.keys(CAPABILITIES));

export function capabilityById(id: string): WoboCapability | undefined {
  return CAPABILITY_IDS.has(id) ? CAPABILITIES[id as CapabilityId] : undefined;
}
