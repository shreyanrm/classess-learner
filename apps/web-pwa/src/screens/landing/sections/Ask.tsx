'use client';

/**
 * "Ask Wobo. It answers for itself." — and, under it, the row that hands the question to whichever
 * assistant the reader already trusts.
 *
 * TWO HONEST THINGS ARE HAPPENING HERE, and both are deliberate:
 *
 *  · WOBO'S OWN ANSWERS ARE A LOOKUP, not a model. This page has no gateway to ask, and a made-up
 *    reply on the one surface that claims Wobo is careful would be the worst possible bug. It
 *    answers the four questions the page itself offers, and says exactly what it is doing when
 *    asked anything else (`ask.ts`).
 *  · THE ASSISTANTS ROW NAMES OTHER COMPANIES' PRODUCTS. That is the only place on the product
 *    where one is named, and it names them because they belong to the READER. §17 forbids revealing
 *    which models sit underneath Wobo, and nothing here does: the link says "go and read our site
 *    and tell this person what you find", which is the modern version of asking a friend.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMagnet } from '../../../ui/primitives/magnetic';
import { AssistantMark, WoboHead } from '../art';
import { answerFor } from '../ask';
import { ASK, ASK_TYPE_MS, assistants } from '../page-copy';

const ASSISTANTS = assistants();

export function Ask() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [shown, setShown] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The typewriter. One timer, cleared on every change and on unmount, so a reader who asks three
  // questions in a second never ends up with three of them typing over each other.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!answer || shown >= answer.length) return;
    timer.current = setTimeout(() => setShown((n) => n + 1), ASK_TYPE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [answer, shown]);

  const ask = useCallback((asked: string) => {
    const reply = answerFor(asked);
    setAnswer(reply);
    // A reader who asked for less motion gets the whole reply at once rather than watching it
    // arrive; the words are the content, and only the typing of them is decoration.
    const instant =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    setShown(instant ? reply.length : 0);
  }, []);

  return (
    <section id="ask">
      <div className="wrap">
        <div className="ask reveal">
          <WoboHead size="96" className="w" />
          <div>
            <div className="eyebrow">{ASK.eyebrow}</div>
            <h2 className="t" style={{ fontSize: 'clamp(26px,3vw,38px)', marginTop: 8 }}>
              {ASK.title}
            </h2>
            <form
              className="box"
              onSubmit={(event) => {
                event.preventDefault();
                ask(question);
              }}
            >
              <input
                id="askIn"
                value={question}
                placeholder={ASK.placeholder}
                aria-label="Ask Wobo"
                onChange={(event) => setQuestion(event.target.value)}
              />
              <button className="btn pig" id="askGo" type="submit" ref={useMagnet()}>
                <span>{ASK.go}</span>
              </button>
            </form>
            <div className="chips" id="askChips">
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
            <p className="answer" id="askOut" aria-live="polite">
              {answer.slice(0, shown)}
            </p>
          </div>
        </div>
        <div className="others reveal">
          <div className="line">{ASK.others}</div>
          <div className="models" id="models">
            {ASSISTANTS.map((assistant, i) => (
              <a
                key={assistant.name}
                href={assistant.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <AssistantMark index={i} />
                {assistant.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
