/** The five generative-UI paths — types, the keyless classifier, and the in-thread renderers. */

export { TurnAttachments } from './cards';
export { classifyLocal, freshOffers, resolveTurnExtras } from './classify';
export type {
  ActionAttachment,
  ComponentAttachment,
  ComponentKind,
  ConfidenceBand,
  Flashcard,
  QuizItem,
  RouteAttachment,
  TurnExtras,
  VizAttachment,
  VizKind,
  WoboPath,
} from './types';
