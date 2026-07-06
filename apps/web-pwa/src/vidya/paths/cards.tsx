'use client';

/**
 * Path results rendered inside the conversation thread (home front door and the docked drawer):
 * a sim or quiz she summoned, a drawing she made, or an action she offers through the capability
 * registry. Every action card is explainable — one why line, its evidence, and the confidence
 * band — and its outcome (taken / ignored) is recorded on the event backbone.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { type CSSProperties, useEffect, useState } from 'react';
import { DiagramView } from '../../engines/DiagramView';
import { parseSimSpec, SimRunner, simSpecFromGateway } from '../../engines/SimRunner';
import { useRouter } from '../../shell/router';
import { useSdk } from '../../store/sdk';
import { MagneticButton } from '../../ui/kit';
import { capabilityById } from '../capabilities';
import { type ChatTurn, useVidyaChat } from '../chat';
import { freshOffers } from './classify';
import type { ActionAttachment, Flashcard, QuizItem, TurnExtras } from './types';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const whisper: CSSProperties = { fontSize: '0.78rem', color: 'var(--clss-ink-500)' };

const rise = {
  initial: { opacity: 0, y: 10, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring', stiffness: 300, damping: 28 },
} as const;

function Shell({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <motion.div
      {...rise}
      style={{
        width: '100%',
        background: '#FFFFFF',
        border: '0.5px solid var(--clss-hairline-on-paper-strong)',
        borderRadius: 'var(--clss-radius-sm)',
        padding: '14px 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <span
        style={{
          ...whisper,
          textTransform: 'lowercase',
          letterSpacing: '0.04em',
        }}
      >
        {eyebrow}
      </span>
      {children}
    </motion.div>
  );
}

// --- quiz -----------------------------------------------------------------------------------------

function parseQuizItems(spec: unknown): QuizItem[] {
  if (!isRecord(spec) || !Array.isArray(spec.items)) return [];
  return spec.items.flatMap((raw): QuizItem[] => {
    if (!isRecord(raw)) return [];
    const { id, type, prompt, options, answer } = raw;
    if (typeof prompt !== 'string' || typeof answer !== 'string' || !prompt || !answer) return [];
    if (type === 'mcq') {
      if (!Array.isArray(options)) return [];
      const opts = options.filter((o): o is string => typeof o === 'string' && o.length > 0);
      if (opts.length < 2 || !opts.includes(answer)) return [];
      return [{ id: String(id ?? prompt), type: 'mcq', prompt, options: opts, answer }];
    }
    if (type === 'fill') return [{ id: String(id ?? prompt), type: 'fill', prompt, answer }];
    return [];
  });
}

function QuizCard({ items }: { items: QuizItem[] }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [right, setRight] = useState(0);
  const item = items[idx];
  const answered = picked !== null;
  const correct = answered && picked === item?.answer;

  if (!item) {
    return (
      <div style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
        {right} of {items.length} on the first try.{' '}
        <span style={whisper}>
          {right === items.length ? 'clean sweep — that holds.' : 'the misses are the map.'}
        </span>
      </div>
    );
  }

  const settle = (value: string) => {
    if (answered) return;
    setPicked(value);
    if (value === item.answer) setRight((n) => n + 1);
  };
  const next = () => {
    setIdx((i) => i + 1);
    setPicked(null);
    setTyped('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={whisper}>
        {idx + 1} of {items.length}
      </span>
      <div style={{ fontSize: '0.98rem', lineHeight: 1.55, fontWeight: 550 }}>{item.prompt}</div>

      {item.type === 'mcq' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(item.options ?? []).map((option) => {
            const chosen = picked === option;
            const isAnswer = option === item.answer;
            const border = !answered
              ? 'var(--clss-hairline-on-paper-strong)'
              : isAnswer
                ? 'var(--clss-feedback-correct)'
                : chosen
                  ? 'var(--clss-feedback-retry)'
                  : 'var(--clss-hairline-on-paper)';
            const background = !answered
              ? '#FFFFFF'
              : isAnswer
                ? 'var(--clss-feedback-correctSoft)'
                : chosen
                  ? 'var(--clss-feedback-retrySoft)'
                  : '#FFFFFF';
            return (
              <button
                key={option}
                type="button"
                onClick={() => settle(option)}
                style={{
                  textAlign: 'left',
                  padding: '11px 13px',
                  fontSize: '0.92rem',
                  lineHeight: 1.45,
                  fontFamily: 'inherit',
                  color: 'var(--clss-ink-900)',
                  border: `1px solid ${border}`,
                  borderRadius: 'var(--clss-radius-sm)',
                  background,
                  cursor: answered ? 'default' : 'pointer',
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) settle(typed.trim());
          }}
          style={{ display: 'flex', gap: 8 }}
        >
          <input
            value={answered ? (picked ?? '') : typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={answered}
            placeholder="type your answer"
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: '0.92rem',
              fontFamily: 'inherit',
              outline: 'none',
              color: 'var(--clss-ink-900)',
              background: '#FFFFFF',
              borderRadius: 'var(--clss-radius-sm)',
              border: `1px solid ${
                !answered
                  ? 'var(--clss-hairline-on-paper-strong)'
                  : correct
                    ? 'var(--clss-feedback-correct)'
                    : 'var(--clss-feedback-retry)'
              }`,
            }}
          />
          {!answered && (
            <MagneticButton
              variant="quiet"
              size="sm"
              onClick={() => typed.trim() && settle(typed.trim())}
            >
              check
            </MagneticButton>
          )}
        </form>
      )}

      <AnimatePresence initial={false}>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                color: correct ? 'var(--clss-feedback-correct)' : 'var(--clss-ink-700)',
              }}
            >
              {correct
                ? 'that holds.'
                : item.type === 'fill'
                  ? `close — it was "${item.answer}".`
                  : 'not this time — the marked one survives the test.'}
            </span>
            <MagneticButton variant="quiet" size="sm" onClick={next}>
              {idx + 1 < items.length ? 'next' : 'finish'}
            </MagneticButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- flashcards -------------------------------------------------------------------------------------

function parseFlashcards(spec: unknown): Flashcard[] {
  if (!isRecord(spec) || !Array.isArray(spec.cards)) return [];
  return spec.cards.flatMap((raw): Flashcard[] => {
    if (!isRecord(raw)) return [];
    const { front, hint, back } = raw;
    if (typeof front !== 'string' || typeof back !== 'string' || !front || !back) return [];
    return [{ front, back, hint: typeof hint === 'string' ? hint : undefined }];
  });
}

function FlashcardsCard({ cards }: { cards: Flashcard[] }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[idx];
  if (!card) return null;
  const go = (delta: number) => {
    setIdx((i) => Math.min(cards.length - 1, Math.max(0, i + delta)));
    setFlipped(false);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? 'Show the front' : 'Reveal the back'}
        style={{
          minHeight: 120,
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          textAlign: 'center',
          fontFamily: 'inherit',
          background: flipped ? 'var(--clss-canvas)' : '#FFFFFF',
          border: '0.5px solid var(--clss-hairline-on-paper-strong)',
          borderRadius: 'var(--clss-radius-sm)',
          cursor: 'pointer',
          transition: 'background 0.25s ease',
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={flipped ? 'back' : 'front'}
            initial={{ opacity: 0, rotateX: -28 }}
            animate={{ opacity: 1, rotateX: 0 }}
            exit={{ opacity: 0, rotateX: 28 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{
              fontSize: flipped ? '0.95rem' : '1.05rem',
              fontWeight: flipped ? 450 : 600,
              lineHeight: 1.55,
              color: 'var(--clss-ink-900)',
            }}
          >
            {flipped ? card.back : card.front}
          </motion.span>
        </AnimatePresence>
        {!flipped && card.hint && <span style={whisper}>{card.hint}</span>}
        <span style={{ ...whisper, fontSize: '0.7rem' }}>
          {flipped ? 'tap to turn back' : 'tap to reveal'}
        </span>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <MagneticButton variant="ghost" size="sm" onClick={() => go(-1)} disabled={idx === 0}>
          back
        </MagneticButton>
        <span style={whisper}>
          card {idx + 1} of {cards.length}
        </span>
        <MagneticButton
          variant="ghost"
          size="sm"
          onClick={() => go(1)}
          disabled={idx === cards.length - 1}
        >
          next
        </MagneticButton>
      </div>
    </div>
  );
}

// --- the action card (approval + explainability + outcome) ------------------------------------------

const CONFIDENCE_COPY: Record<ActionAttachment['confidence'], string> = {
  high: 'confidence · high',
  medium: 'confidence · medium',
  low: 'confidence · low',
};

function ActionCard({ turnId, action }: { turnId: string; action: ActionAttachment }) {
  const router = useRouter();
  const sdk = useSdk();
  const { updateTurn } = useVidyaChat();
  const [running, setRunning] = useState(false);
  const capability = capabilityById(action.capability);

  const patch = (p: Partial<ActionAttachment>) =>
    updateTurn(turnId, (extras: TurnExtras) =>
      extras.action ? { ...extras, action: { ...extras.action, ...p } } : extras,
    );

  const recordOutcome = (outcome: 'taken' | 'ignored') =>
    sdk.events.record('vidya.offer.outcome.v1', {
      offer_id: action.offerId,
      capability: action.capability,
      outcome,
      confidence: action.confidence,
    });

  const execute = async () => {
    if (!capability || running) return;
    setRunning(true);
    recordOutcome('taken');
    try {
      const result = await capability.run({ router, sdk }, action.params);
      patch({ status: 'taken', result });
    } catch {
      patch({ status: 'taken', result: 'that did not go through — ask me again in a moment.' });
    } finally {
      setRunning(false);
    }
  };

  const dismiss = () => {
    recordOutcome('ignored');
    patch({ status: 'ignored' });
  };

  // safe-automatic: she just does it — once, and only for offers minted this session, so a card
  // replayed from the archive never re-executes on its own.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount, by design
  useEffect(() => {
    if (capability?.rung === 'safe_automatic' && action.status === 'offered') {
      if (freshOffers.delete(action.offerId)) void execute();
    }
  }, []);

  if (!capability) return null;

  return (
    <Shell eyebrow="she can do this">
      <div style={{ fontSize: '0.98rem', fontWeight: 600, lineHeight: 1.4 }}>
        {capability.label(action.params)}
      </div>

      {/* explainable, always: the why, the evidence, the confidence band */}
      <div style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--clss-ink-700)' }}>
        {action.why}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {action.evidence.map((line) => (
          <span key={line} style={whisper}>
            · {line}
          </span>
        ))}
      </div>
      <span
        style={{
          ...whisper,
          alignSelf: 'flex-start',
          padding: '3px 8px',
          background: 'var(--clss-canvas)',
          borderRadius: 'var(--clss-radius-sm)',
        }}
      >
        {CONFIDENCE_COPY[action.confidence]}
      </span>

      {action.status === 'offered' && capability.rung !== 'safe_automatic' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <MagneticButton
            variant="primary"
            size="sm"
            onClick={() => void execute()}
            disabled={running}
          >
            {running ? 'doing it…' : 'approve'}
          </MagneticButton>
          <MagneticButton variant="ghost" size="sm" onClick={dismiss} disabled={running}>
            not now
          </MagneticButton>
        </div>
      )}
      {action.status === 'taken' && action.result && (
        <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--clss-ink-700)' }}>
          {action.result}
        </div>
      )}
      {action.status === 'ignored' && <span style={whisper}>left for later — just ask again.</span>}
    </Shell>
  );
}

// --- the dispatcher ----------------------------------------------------------------------------------

/** Renders whatever a turn carries beyond prose. Inline turns carry nothing and render nothing. */
export function TurnAttachments({ turn }: { turn: ChatTurn }) {
  const extras = turn.extras;
  if (!extras) return null;

  if (extras.path === 'component' && extras.component) {
    const { kind, spec, concept } = extras.component;
    if (kind === 'sim') {
      const parsed = simSpecFromGateway(spec, concept || 'simulation') ?? parseSimSpec(spec);
      return parsed ? (
        <Shell eyebrow="a sim, made for this">
          <SimRunner spec={parsed} />
        </Shell>
      ) : null;
    }
    if (kind === 'quiz') {
      const items = parseQuizItems(spec);
      return items.length > 0 ? (
        <Shell eyebrow={concept ? `a quick quiz · ${concept}` : 'a quick quiz'}>
          <QuizCard items={items} />
        </Shell>
      ) : null;
    }
    const cards = parseFlashcards(spec);
    return cards.length > 0 ? (
      <Shell eyebrow={concept ? `flashcards · ${concept}` : 'flashcards'}>
        <FlashcardsCard cards={cards} />
      </Shell>
    ) : null;
  }

  if (extras.path === 'visualization' && extras.viz) {
    return (
      <Shell eyebrow="drawn for you">
        <DiagramView
          id={turn.id}
          svg={extras.viz.spec.svg}
          label={extras.viz.spec.caption ?? 'a drawing from Vidya'}
          caption={extras.viz.spec.caption}
        />
      </Shell>
    );
  }

  if (extras.path === 'action' && extras.action) {
    return <ActionCard turnId={turn.id} action={extras.action} />;
  }

  if (extras.path === 'route' && extras.route) {
    return (
      <motion.span {...rise} style={{ ...whisper, fontStyle: 'normal' }}>
        taking you to {extras.route.to}
        {extras.route.why ? ` — ${extras.route.why}` : ''}
      </motion.span>
    );
  }

  return null;
}
