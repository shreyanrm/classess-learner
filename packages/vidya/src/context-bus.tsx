'use client';

import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type ActiveAnnotation,
  type ActiveHighlight,
  type ActiveNote,
  type ConsequentialAction,
  reduceActions,
  type VidyaAction,
} from './actions';
import type { VidyaMood } from './identity';

/**
 * The Vidya Context Bus. Every page publishes its full state into it, and registers the elements
 * Vidya may draw on — which turns each page into a canvas she is directly plugged into. She perceives
 * the app through this bus (the four-layer context assembler: turn, session, lifetime, curriculum),
 * never through a screen-share, and she expresses back through it (highlights, annotations, mood,
 * and offered actions). One store is both her eyes and her hands.
 */

// --- Perception: what a page publishes -----------------------------------------------------------

/**
 * The universal scene-graph seams (VIDYA.md §3). Any registered target may implement them, which
 * turns it from an annotatable element into a live scene Vidya reads at code level and can drive.
 * All optional — existing targets keep working unchanged.
 */
export interface SceneSeams {
  /** Semantic scene state, e.g. { grid: '4×4', '(0,2)': 3 } — code-level, never pixels. */
  getSceneState?: () => Record<string, unknown>;
  /** What can be done on this scene right now, as plain phrases for her reasoning. */
  getValidActions?: () => string[];
  /** Apply a tutor-driven state patch (the setState action) — demonstrate by doing. */
  applyTutorAction?: (patch: Record<string, unknown>) => void;
}

/** An element on the page Vidya can point at, highlight, or annotate — and, when it implements the
 * scene seams, read and drive. */
export interface AnnotatableTarget extends SceneSeams {
  id: string;
  kind: string; // 'expression' | 'step' | 'opener' | 'concept' | 'control' | 'region' | ...
  label: string; // human/AI-readable meaning, e.g. "the step where 3 was moved across"
  meaning?: string;
  /** Live viewport rect, for the overlay to position marks. */
  getRect: () => DOMRect | null;
}

/** The serialized scene a target exposes into Vidya's assembled context. */
export interface TargetScene {
  state?: Record<string, unknown>;
  validActions?: string[];
  /** True when the target accepts setState (it implements applyTutorAction). */
  drivable: boolean;
}

export interface CanvasWorking {
  nodeId: string;
  equation?: string;
  steps: string[];
  lastEditedAt?: string;
}

export interface PageContext {
  route: string;
  state: Record<string, unknown>;
}
export interface CurriculumContext {
  nodeId?: string;
  nodeName?: string;
  band?: string;
  prerequisiteIds?: string[];
}
export interface SessionContext {
  sessionId: string;
  recentEvents: string[];
}
export interface TurnContext {
  recentTurns: { role: 'user' | 'vidya'; text: string }[];
  lastUserInput?: string;
  /** The learner's local wall-clock, so wellbeing turns (late-night, sleep) ride the real time. */
  localTime?: string;
}
export interface LifetimeContext {
  twinSummary?: string;
  masteryHighlights?: string[];
  /** Who she is teaching — the dossier's identity, from the onboarding profile (VIDYA.md §7). */
  learner?: { name: string; age?: number; grade?: string; board?: string };
  /** Durable facts she has learned in conversation — the concierge's notepad. */
  facts?: string[];
  /** Durable accessibility profile — she honors these every turn (family P). */
  accessibility?: { readAloud?: boolean; largeText?: boolean; highContrast?: boolean };
  /** Persistent instruction language — she teaches in this until it's changed. */
  language?: string;
}

/**
 * The machine room (VIDYA-CAPABILITIES.md family J) — the system's internal truth for the turn:
 * a mastery-band snapshot, the spaced-review due queue, XP/level/streak, the recent event-stream
 * tail, and any in-flight content generation. Digests, never dumps — the app assembles it each turn
 * and the gateway renders it compactly so she references it naturally ("3 reviews due, two minutes
 * each", "how far to level 5" answered exactly).
 */
export interface MachineRoomContext {
  /** How many nodes sit in each mastery band right now, e.g. { developing: 3, secure: 2 }. */
  masteryBands?: Record<string, number>;
  /** Spaced-review queue: how many are due now, how many scheduled, and the soonest few. */
  reviews?: { dueCount: number; scheduled: number; next?: { node: string; inMinutes: number }[] };
  /** Gamification state — enough to answer "how far to level N" exactly. */
  progress?: { xp: number; level: number; intoLevel: number; toNext: number; streakDays: number };
  /** The event-stream tail, richest last (~8): what they clicked, answered, hesitated on. */
  eventTail?: string[];
  /** In-flight content generation — the one composing right now, if any. */
  generating?: { what: string };
}

/** The full, serializable context Vidya reasons over — her perception of the app. */
export interface VidyaAssembledContext {
  page: PageContext;
  curriculum: CurriculumContext;
  session: SessionContext;
  turn: TurnContext;
  lifetime: LifetimeContext;
  canvas?: CanvasWorking;
  /** The system's live internal state (family J) — assembled by the app each turn. */
  machine?: MachineRoomContext;
  targets: { id: string; kind: string; label: string; meaning?: string; scene?: TargetScene }[];
}

// --- Expression: what Vidya draws (ActiveHighlight / ActiveAnnotation live in ./actions) ---------

export interface VidyaHandlers {
  navigate?: (route: string) => void;
  startPractice?: (nodeId: string) => void;
  switchModality?: (to: string) => void;
  onSay?: (text: string) => void;
  /**
   * Voice-locked speech (the speak action): play through the voice path when live, otherwise render
   * as her handwritten line. When absent, speak degrades to onSay.
   */
  onSpeak?: (text: string) => void;
  onRevealHint?: (level: number) => void;
  onEscalateHint?: () => void;
  /** Persist a durable fact she just learned (the remember action) into the learner's mind. */
  onRemember?: (text: string) => void;
}

export interface VidyaBus {
  // perception (publish)
  registerTarget(target: AnnotatableTarget): () => void;
  publishPage(page: PageContext): void;
  publishCurriculum(curriculum: CurriculumContext): void;
  publishSession(session: SessionContext): void;
  publishTurn(turn: TurnContext): void;
  publishLifetime(lifetime: LifetimeContext): void;
  publishCanvas(canvas: CanvasWorking | undefined): void;
  publishMachine(machine: MachineRoomContext | undefined): void;
  // perception (read)
  assembleContext(): VidyaAssembledContext;
  getTargets(): AnnotatableTarget[];
  targetsVersion: number;
  /**
   * Drive a registered scene through its applyTutorAction seam (the setState action). Returns true
   * when the target exists and accepts tutor actions.
   */
  applyTutorAction(targetId: string, patch: Record<string, unknown>): boolean;
  // expression
  mood: VidyaMood;
  highlights: ActiveHighlight[];
  annotations: ActiveAnnotation[];
  notes: ActiveNote[];
  /** performance.now() when the current marks were drawn; the overlay fades each by its own ttl. */
  marksBornAt: number;
  /** Bumped each time she re-inks a faded mark set, so the overlay reseeds the strokes fresh. */
  reinkNonce: number;
  pendingOffer: ConsequentialAction | null;
  dispatch(actions: VidyaAction[]): void;
  /**
   * Re-ink the marks she last drew (family M): her ink is transient and fades, so this brings the
   * last set back — freshly drawn — when the learner refers to a drawing no longer on screen.
   * Returns false when she has drawn nothing to bring back.
   */
  redrawLastMarks(): boolean;
  acceptOffer(): void;
  dismissOffer(): void;
  clearMarks(): void;
}

/** Default mark lifetime + fade window, when Vidya doesn't name a ttl. Marks are always transient. */
const DEFAULT_MARK_TTL = 6000;
const MARK_FADE_MS = 500;

const BusContext = createContext<VidyaBus | null>(null);

export function useVidyaBus(): VidyaBus {
  const bus = useContext(BusContext);
  if (!bus) throw new Error('useVidyaBus must be used within a <VidyaProvider>');
  return bus;
}

export interface VidyaProviderProps {
  children: ReactNode;
  handlers?: VidyaHandlers;
}

export function VidyaProvider({ children, handlers }: VidyaProviderProps) {
  // Perception fields are refs, not state: publishing them must NOT recreate the bus object, or every
  // consumer effect that publishes page/canvas would re-run and loop. They are read on demand when
  // Vidya assembles her context. Only expression state (mood/marks/offer) drives re-renders.
  const pageRef = useRef<PageContext>({ route: 'today', state: {} });
  const curriculumRef = useRef<CurriculumContext>({});
  const sessionRef = useRef<SessionContext>({ sessionId: 'dev-session', recentEvents: [] });
  const turnRef = useRef<TurnContext>({ recentTurns: [] });
  const lifetimeRef = useRef<LifetimeContext>({});
  const canvasRef = useRef<CanvasWorking | undefined>(undefined);
  const machineRef = useRef<MachineRoomContext | undefined>(undefined);

  const publishPage = useCallback((v: PageContext) => {
    pageRef.current = v;
  }, []);
  const publishCurriculum = useCallback((v: CurriculumContext) => {
    curriculumRef.current = v;
  }, []);
  const publishSession = useCallback((v: SessionContext) => {
    sessionRef.current = v;
  }, []);
  const publishTurn = useCallback((v: TurnContext) => {
    turnRef.current = v;
  }, []);
  const publishLifetime = useCallback((v: LifetimeContext) => {
    lifetimeRef.current = v;
  }, []);
  const publishCanvas = useCallback((v: CanvasWorking | undefined) => {
    canvasRef.current = v;
  }, []);
  const publishMachine = useCallback((v: MachineRoomContext | undefined) => {
    machineRef.current = v;
  }, []);

  const [mood, setMood] = useState<VidyaMood>('idle');
  const [highlights, setHighlights] = useState<ActiveHighlight[]>([]);
  const [annotations, setAnnotations] = useState<ActiveAnnotation[]>([]);
  const [notes, setNotes] = useState<ActiveNote[]>([]);
  const [marksBornAt, setMarksBornAt] = useState(0);
  const [reinkNonce, setReinkNonce] = useState(0);
  const clearTimer = useRef<number | undefined>(undefined);
  // The last non-empty mark set she drew — kept so she can re-ink it after it has faded (family M).
  const lastMarksRef = useRef<{
    highlights: ActiveHighlight[];
    annotations: ActiveAnnotation[];
    notes: ActiveNote[];
  }>({ highlights: [], annotations: [], notes: [] });
  const [pendingOffer, setPendingOffer] = useState<ConsequentialAction | null>(null);

  const targetsRef = useRef<Map<string, AnnotatableTarget>>(new Map());
  const [targetsVersion, setTargetsVersion] = useState(0);
  const handlersRef = useRef<VidyaHandlers | undefined>(handlers);
  handlersRef.current = handlers;

  const registerTarget = useCallback((target: AnnotatableTarget) => {
    targetsRef.current.set(target.id, target);
    setTargetsVersion((v) => v + 1);
    return () => {
      targetsRef.current.delete(target.id);
      setTargetsVersion((v) => v + 1);
    };
  }, []);

  const getTargets = useCallback(() => Array.from(targetsRef.current.values()), []);

  const assembleContext = useCallback(
    (): VidyaAssembledContext => ({
      page: pageRef.current,
      curriculum: curriculumRef.current,
      session: sessionRef.current,
      turn: turnRef.current,
      lifetime: lifetimeRef.current,
      canvas: canvasRef.current,
      machine: machineRef.current,
      targets: getTargets().map((t) => {
        const drivable = typeof t.applyTutorAction === 'function';
        const hasScene = drivable || t.getSceneState || t.getValidActions;
        return {
          id: t.id,
          kind: t.kind,
          label: t.label,
          meaning: t.meaning,
          scene: hasScene
            ? {
                state: t.getSceneState?.(),
                validActions: t.getValidActions?.(),
                drivable,
              }
            : undefined,
        };
      }),
    }),
    [getTargets],
  );

  const applyTutorAction = useCallback((targetId: string, patch: Record<string, unknown>) => {
    const target = targetsRef.current.get(targetId);
    if (!target?.applyTutorAction) return false;
    target.applyTutorAction(patch);
    return true;
  }, []);

  const clearMarks = useCallback(() => {
    setHighlights([]);
    setAnnotations([]);
    setNotes([]);
  }, []);

  // Arm the fade timer for a set of live marks — each fades by its own ttl; this clears the residue.
  const scheduleClear = useCallback((marks: { ttl?: number }[]) => {
    if (clearTimer.current !== undefined) window.clearTimeout(clearTimer.current);
    if (marks.length > 0) {
      const maxTtl = Math.max(...marks.map((m) => m.ttl ?? DEFAULT_MARK_TTL));
      clearTimer.current = window.setTimeout(() => {
        setHighlights([]);
        setAnnotations([]);
        setNotes([]);
      }, maxTtl + MARK_FADE_MS);
    } else {
      clearTimer.current = undefined;
    }
  }, []);

  const redrawLastMarks = useCallback((): boolean => {
    const last = lastMarksRef.current;
    const marks = [...last.highlights, ...last.annotations, ...last.notes];
    if (marks.length === 0) return false;
    setHighlights(last.highlights);
    setAnnotations(last.annotations);
    setNotes(last.notes);
    setMarksBornAt(performance.now());
    setReinkNonce((n) => n + 1); // reseed the strokes so the re-ink is fresh, not a photocopy
    scheduleClear(marks);
    return true;
  }, [scheduleClear]);

  const dispatch = useCallback(
    (actions: VidyaAction[]) => {
      // Each dispatch is Vidya's fresh focus: replace the marks, keep the mood unless she changes it.
      const effects = reduceActions(actions);
      const h = handlersRef.current;
      setHighlights(effects.highlights);
      setAnnotations(effects.annotations);
      setNotes(effects.notes);
      setMarksBornAt(performance.now());
      if (effects.mood) setMood(effects.mood);
      setPendingOffer(effects.offer);
      for (const text of effects.says) h?.onSay?.(text);
      // speak is voice-locked: through the voice path when the app wires onSpeak (live), otherwise it
      // degrades to her written line.
      for (const text of effects.speaks) {
        if (h?.onSpeak) h.onSpeak(text);
        else h?.onSay?.(text);
      }
      // setState demonstrations route to each scene's applyTutorAction seam; unknown or non-drivable
      // targets are ignored (she can only drive what publishes itself).
      for (const s of effects.setStates) applyTutorAction(s.targetId, s.patch);
      for (const level of effects.revealHints) h?.onRevealHint?.(level);
      for (let i = 0; i < effects.escalateHints; i += 1) h?.onEscalateHint?.();
      // she writes to her own dossier — a fact learned here rides every future turn
      for (const text of effects.remembers) h?.onRemember?.(text);

      // Marks are ephemeral: clear them once the longest ttl elapses (each fades by its own ttl in the
      // overlay). Vidya decides the ttl per mark; nothing lingers permanently.
      const marks = [...effects.highlights, ...effects.annotations, ...effects.notes];
      if (effects.redrawMarks && marks.length === 0) {
        // she asked to bring her last drawing back and drew nothing new this turn — re-ink it fresh
        redrawLastMarks();
      } else {
        if (marks.length > 0) {
          lastMarksRef.current = {
            highlights: effects.highlights,
            annotations: effects.annotations,
            notes: effects.notes,
          };
        }
        scheduleClear(marks);
      }
    },
    [applyTutorAction, redrawLastMarks, scheduleClear],
  );

  const acceptOffer = useCallback(() => {
    setPendingOffer((offer) => {
      const h = handlersRef.current;
      if (offer) {
        if (offer.type === 'navigate') h?.navigate?.(offer.route);
        else if (offer.type === 'startPractice') h?.startPractice?.(offer.nodeId);
        else if (offer.type === 'switchModality') h?.switchModality?.(offer.to);
      }
      return null;
    });
  }, []);

  const dismissOffer = useCallback(() => setPendingOffer(null), []);

  const bus = useMemo<VidyaBus>(
    () => ({
      registerTarget,
      publishPage,
      publishCurriculum,
      publishSession,
      publishTurn,
      publishLifetime,
      publishCanvas,
      publishMachine,
      assembleContext,
      getTargets,
      targetsVersion,
      applyTutorAction,
      mood,
      highlights,
      annotations,
      notes,
      marksBornAt,
      reinkNonce,
      pendingOffer,
      dispatch,
      redrawLastMarks,
      acceptOffer,
      dismissOffer,
      clearMarks,
    }),
    [
      registerTarget,
      publishPage,
      publishCurriculum,
      publishSession,
      publishTurn,
      publishLifetime,
      publishCanvas,
      publishMachine,
      assembleContext,
      getTargets,
      targetsVersion,
      applyTutorAction,
      mood,
      highlights,
      annotations,
      notes,
      marksBornAt,
      reinkNonce,
      pendingOffer,
      dispatch,
      redrawLastMarks,
      acceptOffer,
      dismissOffer,
      clearMarks,
    ],
  );

  return <BusContext.Provider value={bus}>{children}</BusContext.Provider>;
}

/**
 * Register a DOM element as a target Vidya can draw on. Attach the returned ref to the element:
 *   const ref = useRegisterTarget('step-1', { kind: 'step', label: 'the step you subtracted 3' });
 *   return <div ref={ref}>2x = 10</div>;
 *
 * Interactives may also pass the scene seams (getSceneState / getValidActions / applyTutorAction)
 * to become a scene she reads and drives — inline closures are fine, they are held in a ref so
 * re-renders never re-register the target.
 */
export function useRegisterTarget<T extends HTMLElement = HTMLElement>(
  id: string,
  meta: { kind: string; label: string; meaning?: string } & SceneSeams,
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { registerTarget } = useVidyaBus();
  const { kind, label, meaning } = meta;
  const seamsRef = useRef<SceneSeams>(meta);
  seamsRef.current = meta;
  const hasState = Boolean(meta.getSceneState);
  const hasValidActions = Boolean(meta.getValidActions);
  const hasDrive = Boolean(meta.applyTutorAction);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return registerTarget({
      id,
      kind,
      label,
      meaning,
      getRect: () => el.getBoundingClientRect(),
      getSceneState: hasState ? () => seamsRef.current.getSceneState?.() ?? {} : undefined,
      getValidActions: hasValidActions
        ? () => seamsRef.current.getValidActions?.() ?? []
        : undefined,
      applyTutorAction: hasDrive
        ? (patch: Record<string, unknown>) => seamsRef.current.applyTutorAction?.(patch)
        : undefined,
    });
  }, [id, kind, label, meaning, registerTarget, hasState, hasValidActions, hasDrive]);
  return ref;
}
