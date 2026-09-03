'use client';

/**
 * "Ask Wobo about Wobo" — the tutor answering questions about itself, in its own hand.
 *
 * The reply is typed out two characters at a time, which is the same hand-speed the product's board
 * writes at, so the page's one interactive answer feels like the product rather than like a chat
 * widget. The answers are grounded and local (`ask.ts` says why, and what replaces them once the
 * gateway exposes the help-grounded capability).
 *
 * The typing is a `setTimeout` chain rather than a state update per character on a timer, because
 * it has to stop the moment a new question arrives — a second answer typing over the first is the
 * classic bug in this pattern, and the ref below is the whole fix.
 */

import { WoboBody } from '@wobo/wobo';
import { useEffect, useRef, useState } from 'react';
import { askWobo, type Reply, replyLength, TYPE_MS, TYPE_STEP, typedTo } from './ask';
import { ASK } from './copy';

export function Ask() {
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState<Reply>([]);
  const [typed, setTyped] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ask = (q: string) => {
    if (!q.trim()) return;
    setReply(askWobo(q));
    setTyped(0);
  };

  // One chain per reply. Changing the reply cancels the previous chain on the way in.
  useEffect(() => {
    const total = replyLength(reply);
    if (!total) return;
    let n = 0;
    const step = () => {
      n = Math.min(total, n + TYPE_STEP);
      setTyped(n);
      if (n < total) timer.current = setTimeout(step, TYPE_MS);
    };
    timer.current = setTimeout(step, TYPE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reply]);

  return (
    <section id="ask">
      <div className="wrap">
        <div className="askbox reveal">
          <div className="askhead">
            <WoboBody
              size={96}
              className="askwobo"
              label="Wobo"
              style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1' }}
            />
            <div>
              <span className="chapter">{ASK.chapter}</span>
              <h2 className="t">{ASK.title}</h2>
            </div>
          </div>

          <form
            className="askform"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            <input
              type="text"
              value={question}
              placeholder={ASK.placeholder}
              aria-label={ASK.inputLabel}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button className="btn pig" type="submit">
              {ASK.submit}
            </button>
          </form>

          <div className="chips" aria-label={ASK.chipsLabel}>
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
          </div>

          <div className="reply" aria-live="polite">
            {typedTo(reply, typed).map((segment, i) =>
              segment.em ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional by design
                <em key={i}>{segment.text}</em>
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional by design
                <span key={i}>{segment.text}</span>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
