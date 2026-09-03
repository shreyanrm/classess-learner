/**
 * The five generative-UI paths (WOBO.md §6) — the taxonomy is the contract. Every Wobo turn
 * lands on exactly one: inline prose, a component summoned into the thread, a visualization drawn
 * to answer, a governed action through the capability registry, or a route to a full surface.
 *
 * These types are the client half of the gateway's additive response shape
 * (services/gateway/src/wobo_gateway/wobo.py) — say/actions stay untouched; path payloads
 * ride alongside.
 */

export type WoboPath = 'inline' | 'component' | 'visualization' | 'action' | 'route';

export type ComponentKind = 'sim' | 'quiz' | 'flashcards' | 'formula' | 'maker' | 'doodle';
export type VizKind = 'diagram' | 'chart' | 'conceptmap';
export type ConfidenceBand = 'high' | 'medium' | 'low';

/** A verified workbook-style item (mirrors the plexus engine.compose item contract). */
export interface QuizItem {
  id: string;
  type: 'mcq' | 'fill';
  prompt: string;
  options?: string[];
  answer: string;
}

export interface Flashcard {
  front: string;
  hint?: string;
  back: string;
}

export interface ComponentAttachment {
  kind: ComponentKind;
  concept?: string;
  /** Engine artifact (sim) or parsed spec ({items} / {cards}) — validated again at render. */
  spec: unknown;
}

export interface VizAttachment {
  kind: VizKind;
  spec: { svg: string; caption?: string };
}

/**
 * An offered action — every recommendation is explainable (School-doc law): one why line,
 * its evidence, and the confidence band, right on the card. Outcomes are recorded either way.
 */
export interface ActionAttachment {
  capability: string;
  params: Record<string, unknown>;
  why: string;
  evidence: string[];
  confidence: ConfidenceBand;
  /** Correlates the shown card with its wobo.offer.outcome.v1 event. */
  offerId: string;
  status: 'offered' | 'taken' | 'ignored';
  /** Wobo's one-line account of what happened, once executed. */
  result?: string;
}

export interface RouteAttachment {
  to: string;
  why?: string;
}

/** What rides on a ChatTurn beyond prose. Absent on inline turns. */
export interface TurnExtras {
  path: WoboPath;
  component?: ComponentAttachment;
  viz?: VizAttachment;
  action?: ActionAttachment;
  route?: RouteAttachment;
}
