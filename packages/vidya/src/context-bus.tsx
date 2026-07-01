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

/** An element on the page Vidya can point at, highlight, or annotate. */
export interface AnnotatableTarget {
  id: string;
  kind: string; // 'expression' | 'step' | 'opener' | 'concept' | 'control' | 'region' | ...
  label: string; // human/AI-readable meaning, e.g. "the step where 3 was moved across"
  meaning?: string;
  /** Live viewport rect, for the overlay to position marks. */
  getRect: () => DOMRect | null;
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
}
export interface LifetimeContext {
  twinSummary?: string;
  masteryHighlights?: string[];
}

/** The full, serializable context Vidya reasons over — her perception of the app. */
export interface VidyaAssembledContext {
  page: PageContext;
  curriculum: CurriculumContext;
  session: SessionContext;
  turn: TurnContext;
  lifetime: LifetimeContext;
  canvas?: CanvasWorking;
  targets: { id: string; kind: string; label: string; meaning?: string }[];
}

// --- Expression: what Vidya draws (ActiveHighlight / ActiveAnnotation live in ./actions) ---------

export interface VidyaHandlers {
  navigate?: (route: string) => void;
  startPractice?: (nodeId: string) => void;
  switchModality?: (to: string) => void;
  onSay?: (text: string) => void;
  onRevealHint?: (level: number) => void;
  onEscalateHint?: () => void;
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
  // perception (read)
  assembleContext(): VidyaAssembledContext;
  getTargets(): AnnotatableTarget[];
  targetsVersion: number;
  // expression
  mood: VidyaMood;
  highlights: ActiveHighlight[];
  annotations: ActiveAnnotation[];
  pendingOffer: ConsequentialAction | null;
  dispatch(actions: VidyaAction[]): void;
  acceptOffer(): void;
  dismissOffer(): void;
  clearMarks(): void;
}

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
  const [page, setPage] = useState<PageContext>({ route: 'today', state: {} });
  const [curriculum, setCurriculum] = useState<CurriculumContext>({});
  const [session, setSession] = useState<SessionContext>({
    sessionId: 'dev-session',
    recentEvents: [],
  });
  const [turn, setTurn] = useState<TurnContext>({ recentTurns: [] });
  const [lifetime, setLifetime] = useState<LifetimeContext>({});
  const [canvas, setCanvas] = useState<CanvasWorking | undefined>(undefined);

  const [mood, setMood] = useState<VidyaMood>('idle');
  const [highlights, setHighlights] = useState<ActiveHighlight[]>([]);
  const [annotations, setAnnotations] = useState<ActiveAnnotation[]>([]);
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
      page,
      curriculum,
      session,
      turn,
      lifetime,
      canvas,
      targets: getTargets().map((t) => ({
        id: t.id,
        kind: t.kind,
        label: t.label,
        meaning: t.meaning,
      })),
    }),
    [page, curriculum, session, turn, lifetime, canvas, getTargets],
  );

  const clearMarks = useCallback(() => {
    setHighlights([]);
    setAnnotations([]);
  }, []);

  const dispatch = useCallback((actions: VidyaAction[]) => {
    // Each dispatch is Vidya's fresh focus: replace the marks, keep the mood unless she changes it.
    const effects = reduceActions(actions);
    const h = handlersRef.current;
    setHighlights(effects.highlights);
    setAnnotations(effects.annotations);
    if (effects.mood) setMood(effects.mood);
    setPendingOffer(effects.offer);
    for (const text of effects.says) h?.onSay?.(text);
    for (const level of effects.revealHints) h?.onRevealHint?.(level);
    for (let i = 0; i < effects.escalateHints; i += 1) h?.onEscalateHint?.();
  }, []);

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
      publishPage: setPage,
      publishCurriculum: setCurriculum,
      publishSession: setSession,
      publishTurn: setTurn,
      publishLifetime: setLifetime,
      publishCanvas: setCanvas,
      assembleContext,
      getTargets,
      targetsVersion,
      mood,
      highlights,
      annotations,
      pendingOffer,
      dispatch,
      acceptOffer,
      dismissOffer,
      clearMarks,
    }),
    [
      registerTarget,
      assembleContext,
      getTargets,
      targetsVersion,
      mood,
      highlights,
      annotations,
      pendingOffer,
      dispatch,
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
 */
export function useRegisterTarget<T extends HTMLElement = HTMLElement>(
  id: string,
  meta: { kind: string; label: string; meaning?: string },
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { registerTarget } = useVidyaBus();
  const { kind, label, meaning } = meta;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return registerTarget({ id, kind, label, meaning, getRect: () => el.getBoundingClientRect() });
  }, [id, kind, label, meaning, registerTarget]);
  return ref;
}
