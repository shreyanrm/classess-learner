import { z } from 'zod';
import type { VidyaMood } from './identity';

/**
 * Vidya's action vocabulary — the things she can DO on the page, not just say. Her reasoning returns
 * a list of these; the executor runs the in-context ones immediately and OFFERS the consequential
 * ones (the calm principle: power is available, never imposed). This is what makes her feel directly
 * connected to the app — she can point at, highlight, and mark up the very page the learner is on.
 */

export const HIGHLIGHT_LEVELS = ['primary', 'secondary', 'tertiary'] as const;
export type HighlightLevel = (typeof HIGHLIGHT_LEVELS)[number];

export const ANNOTATION_KINDS = [
  'underline',
  'circle',
  'arrow',
  'bracket',
  'check',
  'crossOut',
  'lookHere',
] as const;
export type AnnotationKind = (typeof ANNOTATION_KINDS)[number];

const MOODS = ['idle', 'thinking', 'listening', 'correct', 'celebrate', 'waiting', 'hint'] as const;

const level = z.enum(HIGHLIGHT_LEVELS).optional();

export const VidyaActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('say'), text: z.string() }),
  z.object({ type: z.literal('setMood'), mood: z.enum(MOODS) }),
  z.object({ type: z.literal('highlight'), targetId: z.string(), level }),
  z.object({
    type: z.literal('annotate'),
    targetId: z.string(),
    mark: z.enum(ANNOTATION_KINDS),
    level,
  }),
  z.object({ type: z.literal('point'), targetId: z.string() }),
  z.object({ type: z.literal('revealHint'), level: z.number().int().nonnegative() }),
  z.object({ type: z.literal('escalateHint') }),
  // Consequential — offered, never forced.
  z.object({ type: z.literal('navigate'), route: z.string(), reason: z.string().optional() }),
  z.object({ type: z.literal('startPractice'), nodeId: z.string(), reason: z.string().optional() }),
  z.object({ type: z.literal('switchModality'), to: z.string(), reason: z.string().optional() }),
]);

export type VidyaAction = z.infer<typeof VidyaActionSchema>;
export type ConsequentialAction = Extract<
  VidyaAction,
  { type: 'navigate' | 'startPractice' | 'switchModality' }
>;

const CONSEQUENTIAL = new Set(['navigate', 'startPractice', 'switchModality']);

export function isConsequential(action: VidyaAction): action is ConsequentialAction {
  return CONSEQUENTIAL.has(action.type);
}

/** Validate a raw action list from Vidya's reasoning; silently drop anything malformed. */
export function parseActions(raw: unknown): VidyaAction[] {
  if (!Array.isArray(raw)) return [];
  const actions: VidyaAction[] = [];
  for (const item of raw) {
    const result = VidyaActionSchema.safeParse(item);
    if (result.success) actions.push(result.data);
  }
  return actions;
}

// --- The pure reducer (so dispatch is testable without a DOM) -----------------------------------

export interface ActiveHighlight {
  targetId: string;
  level: HighlightLevel;
}
export interface ActiveAnnotation {
  targetId: string;
  mark: AnnotationKind;
  level: HighlightLevel;
}

export interface ActionEffects {
  highlights: ActiveHighlight[];
  annotations: ActiveAnnotation[];
  mood: VidyaMood | null;
  offer: ConsequentialAction | null;
  says: string[];
  revealHints: number[];
  escalateHints: number;
}

/** Fold a list of actions into the marks/mood/offer to apply and the side-effects to fire. Pure. */
export function reduceActions(actions: VidyaAction[]): ActionEffects {
  const effects: ActionEffects = {
    highlights: [],
    annotations: [],
    mood: null,
    offer: null,
    says: [],
    revealHints: [],
    escalateHints: 0,
  };
  for (const action of actions) {
    switch (action.type) {
      case 'say':
        effects.says.push(action.text);
        break;
      case 'setMood':
        effects.mood = action.mood;
        break;
      case 'highlight':
        effects.highlights.push({ targetId: action.targetId, level: action.level ?? 'primary' });
        break;
      case 'annotate':
        effects.annotations.push({
          targetId: action.targetId,
          mark: action.mark,
          level: action.level ?? 'primary',
        });
        break;
      case 'point':
        effects.highlights.push({ targetId: action.targetId, level: 'primary' });
        effects.annotations.push({ targetId: action.targetId, mark: 'lookHere', level: 'primary' });
        break;
      case 'revealHint':
        effects.revealHints.push(action.level);
        break;
      case 'escalateHint':
        effects.escalateHints += 1;
        break;
      default:
        if (isConsequential(action)) effects.offer = action;
    }
  }
  return effects;
}

/**
 * A compact description of the action vocabulary, for Vidya's reasoning prompt. She is told the
 * registered target ids and picks among these actions to point at the learner's actual working.
 */
export function describeActionVocabulary(): string {
  return [
    'You may return actions to act on the page the learner is looking at. Available actions:',
    '- say: {"type":"say","text":"..."} — speak to the learner (a nudge, never the final answer).',
    '- highlight: {"type":"highlight","targetId":"<id>","level":"primary|secondary|tertiary"} — glow a target.',
    '- annotate: {"type":"annotate","targetId":"<id>","mark":"underline|circle|arrow|bracket|check|crossOut|lookHere","level":"..."}.',
    '- point: {"type":"point","targetId":"<id>"} — draw attention to a target.',
    '- setMood: {"type":"setMood","mood":"thinking|hint|correct|celebrate|waiting|idle"}.',
    '- revealHint: {"type":"revealHint","level":<n>} / escalateHint: {"type":"escalateHint"}.',
    '- navigate/startPractice/switchModality — consequential; these are OFFERED to the learner, not forced.',
    'Only reference targetId values that appear in the provided target registry.',
  ].join('\n');
}
