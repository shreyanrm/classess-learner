'use client';

/**
 * "Still wondering? Ask Wobo. It answers for itself."
 *
 * The section that makes the argument by doing the thing: type a question about Wobo and Wobo
 * writes back, in its own hand, typed out two characters at a time. On this page the replies are
 * local and grounded (`ask.ts`); inside the app the same panel calls the help-grounded capability,
 * unauthenticated and on a tiny budget, and falls back to exactly this table when there is nothing
 * to ask.
 *
 * The reply is `aria-live="polite"` and, under reduced motion, arrives whole rather than typed —
 * a screen reader should not be handed a sentence one fragment at a time, and a reader who asked
 * for less motion did not ask to wait.
 *
 * The Wobo above the field is the real rig, watching the pointer.
 */

import { useReducedMotion } from '@wobo/motion';
import { WoboBody } from '@wobo/wobo';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  type AskAnswer,
  answerFor,
  answerLength,
  TYPE_STEP,
  TYPE_TICK_MS,
  typedRuns,
} from '../ask';
import { useLastInput } from '../attention';
import { useBoxWidth, woboSize } from '../measure';
import { ASK } from '../page-copy';

export function Ask() {
  const reduced = useReducedMotion();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [chars, setChars] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const woboBox = useRef<HTMLDivElement>(null);
  const idleSince = useLastInput();
  // 96px on desktop, 64 on a phone — the stylesheet's own two sizes, measured rather than guessed.
  const size = woboSize(useBoxWidth(woboBox), 1, 96, 56);

  // The typewriter. One interval per reply, cleared the moment the reply is finished or replaced,
  // so a visitor who asks five things in a row never has five timers running.
  useEffect(() => {
    clearInterval(timer.current);
    if (!answer) return;
    const total = answerLength(answer);
    if (reduced) {
      setChars(total);
      return;
    }
    setChars(0);
    timer.current = setInterval(() => {
      setChars((c) => {
        const next = c + TYPE_STEP;
        if (next >= total) clearInterval(timer.current);
        return Math.min(total, next);
      });
    }, TYPE_TICK_MS);
    return () => clearInterval(timer.current);
  }, [answer, reduced]);

  const ask = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setAnswer(answerFor(trimmed));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(question);
  };

  const runs = answer ? typedRuns(answer, chars) : null;

  return (
    <section id="ask">
      <div className="wrap">
        <div className="askbox reveal">
          <div className="askhead">
            <div className="askwobo" ref={woboBox}>
              <WoboBody
                size={size}
                gaze="pointer"
                idleSince={idleSince}
                mood={answer ? 'explaining' : 'listening'}
                label="Wobo"
              />
            </div>
            <div>
              <span className="chapter">{ASK.chapter}</span>
              <h2 className="t">{ASK.title}</h2>
            </div>
          </div>

          <form className="askform" id="askForm" autoComplete="off" onSubmit={onSubmit}>
            <input
              id="askInput"
              type="text"
              placeholder={ASK.placeholder}
              aria-label={ASK.inputLabel}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button className="btn pig" type="submit">
              {ASK.submit}
            </button>
          </form>

          <fieldset className="chips" aria-label={ASK.chipsLabel}>
            {ASK.chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setQuestion(chip);
                  ask(chip);
                }}
              >
                {chip}
              </button>
            ))}
          </fieldset>

          <div className="reply" id="askReply" aria-live="polite">
            {runs ? (
              <span>
                {runs.plain}
                <em>{runs.accent}</em>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
