'use client';

/**
 * /for-students — it never makes you feel small. A port of design/prototypes/site-students.html,
 * word for word and section for section: the paused film with the lasso, ask the basic thing,
 * it draws, it rings the gap (colour half the square — the thing to try), it notices when you
 * nail it (turn the ray to a right angle), your streak your way, the ask block and the close.
 *
 * The two things a visitor can try are real state: the puzzle keeps which cells are lit and
 * what Wobo said about them; the ray keeps its angle. The arithmetic behind both is `maths.ts`.
 */

import { useState } from 'react';
import { Label, Sticker } from '../../ui/primitives';
import { ClosePanel } from '../site/ClosePanel';
import { SiteLink } from '../site/nav';
import { SiteShell } from '../site/SiteShell';
import { PitchAsk } from './Ask';
import {
  ANGLE_MAX,
  ANGLE_MIN,
  ANGLE_START,
  angleView,
  checkPuzzle,
  PUZZLE_LINES,
  type PuzzleVerdict,
} from './maths';
import { Reveal } from './Reveal';
import { ensurePitchStyles } from './styles';

ensurePitchStyles();

const CELLS = ['cell 1', 'cell 2', 'cell 3', 'cell 4'] as const;

function Puzzle() {
  const [lit, setLit] = useState<boolean[]>([false, false, false, false]);
  const [verdict, setVerdict] = useState<PuzzleVerdict>({
    line: PUZZLE_LINES.start,
    win: false,
    ring: null,
  });
  const [show, setShow] = useState(false);

  const toggle = (i: number) => {
    setLit((cells) => cells.map((on, j) => (j === i ? !on : on)));
    setShow(false);
    setVerdict((v) => ({ line: '', win: false, ring: v.ring }));
  };
  const check = () => {
    const v = checkPuzzle(lit);
    // A ring that is not drawn keeps the last loop, so it can draw back on; the word goes with it.
    setVerdict(v.ring ? v : { ...v, ring: verdict.ring });
    setShow(v.ring !== null);
  };
  const reset = () => {
    setLit([false, false, false, false]);
    setShow(false);
    setVerdict((v) => ({ line: PUZZLE_LINES.start, win: false, ring: v.ring }));
  };

  return (
    <div className="su-puzzle">
      <div className="su-pq">
        Colour <i>½</i> of the square.
      </div>
      <div className="su-grid4">
        {CELLS.map((label, i) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-pressed={lit[i]}
            className={lit[i] ? 'su-lit' : undefined}
            onClick={() => toggle(i)}
          />
        ))}
        <svg viewBox="-40 -40 284 284" aria-hidden="true" className={show ? 'su-show' : undefined}>
          <path d={verdict.ring?.d ?? 'M0 0'} />
          <text x="110" y="238" textAnchor="middle">
            {verdict.ring?.text ?? ''}
          </text>
        </svg>
      </div>
      <div className="pt-row">
        <button type="button" className="st-btn" onClick={check}>
          Check
        </button>
        <button type="button" className="st-btn st-quiet" onClick={reset}>
          Start over
        </button>
      </div>
      <div className={verdict.win ? 'su-line su-win' : 'su-line'} aria-live="polite">
        {verdict.line}
      </div>
    </div>
  );
}

function Angle() {
  const [a, setA] = useState(ANGLE_START);
  const v = angleView(a);
  return (
    <div className="su-angle">
      <svg viewBox="0 0 360 220" role="img" aria-label="Turn the ray to make a right angle">
        <path className="pt-ink" d="M40 190 h280" />
        <g transform={v.transform}>
          <path className="pt-ink pt-pig" d="M40 190 h230" />
        </g>
        <path
          d={v.arc}
          fill="none"
          stroke="var(--rose)"
          strokeWidth="3"
          strokeDasharray="5 6"
          opacity={v.ok ? 0 : 1}
        />
        <text className="pt-hw" x={v.label.x} y={v.label.y} fontSize="28">
          {v.deg}
        </text>
        <path className="pt-ink pt-pig" d="M40 166 h24 v24" opacity={v.ok ? 1 : 0} />
        <circle cx="40" cy="190" r="6" fill="var(--ink)" />
      </svg>
      <input
        type="range"
        min={ANGLE_MIN}
        max={ANGLE_MAX}
        value={a}
        aria-label="angle in degrees"
        onChange={(e) => setA(Number(e.target.value))}
      />
      <div className={v.ok ? 'su-line su-win' : 'su-line'} aria-live="polite">
        {v.line}
      </div>
    </div>
  );
}

const DAYS: readonly { day: string; kind: 'lit' | 'rest' }[] = [
  { day: 'M', kind: 'lit' },
  { day: 'T', kind: 'lit' },
  { day: 'W', kind: 'lit' },
  { day: 'T', kind: 'rest' },
  { day: 'F', kind: 'lit' },
  { day: 'S', kind: 'lit' },
  { day: 'S', kind: 'rest' },
  { day: 'M', kind: 'lit' },
  { day: 'T', kind: 'lit' },
  { day: 'W', kind: 'lit' },
  { day: 'T', kind: 'lit' },
  { day: 'F', kind: 'lit' },
];

export function ForStudents() {
  return (
    <SiteShell current="students" title="Wobo for students">
      <div className="pt">
        <section className="pt-hero su-hero">
          <div className="st-wrap">
            <div>
              <Label>For students</Label>
              <h1>
                Ask the question you'd <em>never ask in class.</em>
              </h1>
              <p className="pt-sub">
                The basic one. The embarrassing one. The one you should have asked years ago. Wobo
                answers all of them the same way: drawn out, no face, no sigh, at 10 pm if that's
                when you're doing this.
              </p>
              <div className="pt-row">
                <SiteLink className="st-btn st-pig" to={{ name: 'onboarding' }}>
                  Get early access
                </SiteLink>
                <a className="st-btn st-quiet" href="#try">
                  Try one now
                </a>
                <span className="pt-note">Free every day. No card. No trial that ends.</span>
              </div>
            </div>
            <div className="su-film">
              <div className="su-frame">
                <svg
                  viewBox="0 0 480 300"
                  role="img"
                  aria-label="A paused lesson with a loop drawn around the confusing part"
                >
                  <path className="pt-ink pt-thin" d="M60 240 h360 M80 260 v-220" />
                  <path className="pt-ink" d="M80 220 c60 -20 120 -120 300 -140" />
                  <text className="pt-hw" x="300" y="70" fontSize="26">
                    y = x²
                  </text>
                  <text className="pt-hw pt-dim" x="120" y="280" fontSize="20">
                    paused · 0:38
                  </text>
                  <path
                    className="pt-ink pt-pig su-lasso"
                    d="M196 150 c-18 26 -6 68 36 70 s76 -10 74 -44 s-30 -52 -66 -48 s-40 8 -44 22"
                  />
                </svg>
                <div className="su-q">wait, why does it curve?</div>
              </div>
              <div className="su-bar">
                <span className="su-p">
                  <i />
                </span>
                <span className="su-track" />
                <span>0:38 / 1:42</span>
              </div>
            </div>
          </div>
        </section>

        <section className="st-section">
          <div className="st-wrap">
            <Reveal className="pt-chapter">
              <div>
                <div className="pt-num">01</div>
                <h2>
                  Ask the <span className="pt-hl">basic</span> thing.
                </h2>
                <p>
                  "What even is a hypotenuse." "Why is it called integration." "Is the mitochondria
                  the thing or the place." Wobo doesn't keep score of what you should already know.
                  It just answers.
                </p>
                <div className="pt-say">
                  No face. No sigh. <em>Just the answer, drawn.</em>
                </div>
              </div>
              <div className="pt-art">
                <div className="pt-chat">
                  <div className="pt-t">Tuesday, 9:41 pm</div>
                  <div className="pt-me">ok dumb question but what actually is a hypotenuse</div>
                  <div className="pt-wo">
                    Not dumb. It's the <b>longest side</b> of a right triangle, the one opposite the
                    square corner. Want me to draw it?
                  </div>
                  <div className="pt-me">yes</div>
                  <div className="pt-wo">Drawing… watch the corner first.</div>
                </div>
                <Sticker style={{ right: 22, top: 18 }}>no judgement</Sticker>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="st-section">
          <div className="st-wrap">
            <Reveal className="pt-chapter pt-flip">
              <div>
                <div className="pt-num">02</div>
                <h2>
                  It <span className="pt-hl">draws</span>, it doesn't lecture.
                </h2>
                <p>
                  You don't get a wall of text. You get a board, a pen, and the answer appearing one
                  line at a time so you can see where each bit comes from. Pause it. Rewind it.
                  Scribble on it.
                </p>
                <div className="pt-say">
                  If you can watch it being drawn, <em>you can draw it in the exam.</em>
                </div>
              </div>
              <div className="pt-art">
                <svg viewBox="0 0 520 360" aria-hidden="true">
                  <rect className="pt-paper" x="30" y="30" width="460" height="300" rx="22" />
                  <path className="pt-ink pt-draw" d="M170 270 L290 270 L170 180 Z" />
                  <path className="pt-ink pt-thin" d="M170 250 h20 v20" />
                  <path
                    className="pt-ink pt-pig pt-draw"
                    d="M290 270 L380 150 L260 60 L170 180"
                    style={{ transitionDelay: '.9s' }}
                  />
                  <text className="pt-hw pt-pig" x="290" y="150" fontSize="28">
                    c²
                  </text>
                  <text className="pt-hw" x="225" y="302" fontSize="24">
                    4
                  </text>
                  <text className="pt-hw" x="140" y="234" fontSize="24">
                    3
                  </text>
                  <text className="pt-hw" x="400" y="290" fontSize="34">
                    c = 5
                  </text>
                  <path
                    className="pt-ink pt-pig pt-draw"
                    d="M388 262 c-12 20 -6 44 30 46 s66 -6 64 -30 s-24 -40 -56 -36 s-32 8 -38 20"
                    style={{ transitionDelay: '1.6s' }}
                  />
                  <g transform="translate(455 300) rotate(-30)">
                    <rect x="-4" y="-60" width="8" height="46" rx="3" fill="var(--ink)" />
                    <path d="M-4 -14 l4 18 l4 -18 z" fill="var(--pig)" />
                  </g>
                </svg>
                <Sticker rotate={4} style={{ left: 22, bottom: 18 }}>
                  line by line
                </Sticker>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="st-section" id="try">
          <div className="st-wrap">
            <Reveal className="pt-chapter">
              <div>
                <div className="pt-num">03</div>
                <h2>
                  It <span className="pt-hl">rings the gap</span>, it never says wrong.
                </h2>
                <p>
                  Try it. Colour half the square. If you're off, Wobo doesn't flash red, it draws a
                  loop around what you did and tells you what it actually is. Then you go again.
                </p>
                <div className="pt-say">
                  Wrong isn't a word Wobo uses. <em>"Close" is.</em>
                </div>
              </div>
              <div className="pt-art">
                <Puzzle />
              </div>
            </Reveal>
          </div>
        </section>

        <section className="st-section">
          <div className="st-wrap">
            <Reveal className="pt-chapter pt-flip">
              <div>
                <div className="pt-num">04</div>
                <h2>
                  It <span className="pt-hl">notices</span> when you nail it.
                </h2>
                <p>
                  Not a confetti cannon every five seconds. A small, specific fuss when you actually
                  get something, and a quiet note of what you're good at that builds up over the
                  term. Drag the ray to a right angle and see.
                </p>
                <div className="pt-say">
                  Praise you earned <em>hits different.</em>
                </div>
              </div>
              <div className="pt-art">
                <Angle />
              </div>
            </Reveal>
          </div>
        </section>

        <section className="st-section">
          <div className="st-wrap">
            <Reveal className="pt-chapter">
              <div>
                <div className="pt-num">05</div>
                <h2>
                  Your <span className="pt-hl">streak</span>, your way.
                </h2>
                <p>
                  Ten minutes a day is the whole trick, and Wobo keeps the count. But rest days
                  don't break it and nobody gets a guilt notification at midnight. It's your streak,
                  not the app's.
                </p>
                <div className="pt-say">
                  Consistency beats cramming. <em>Every single time.</em>
                </div>
              </div>
              <div className="pt-art">
                <div className="su-streak">
                  <div className="su-n">
                    12<small>days, your way</small>
                  </div>
                  <div className="su-days">
                    {DAYS.map((d, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: a fixed twelve-day strip; the letters repeat
                      <i key={i} className={d.kind === 'lit' ? 'su-lit' : 'su-rest'}>
                        {d.day}
                      </i>
                    ))}
                  </div>
                  <div className="hand">Thursday and Sunday off. Still 12.</div>
                </div>
                <Sticker style={{ right: 22, top: 18 }}>no guilt</Sticker>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="st-section">
          <div className="st-wrap">
            <Reveal>
              <PitchAsk
                page="students"
                heading="Ask Wobo about Wobo. It answers for itself."
                placeholder="Will you tell my parents what I asked?"
                chips={[
                  'Can I ask for help as many times as I want?',
                  'What happens to my streak if I rest?',
                  'Are you a boy or a girl?',
                ]}
              />
            </Reveal>
          </div>
        </section>

        <ClosePanel
          title="Be first in line."
          quiet={{ label: 'See how it works', href: '/how-it-works' }}
        />
      </div>
    </SiteShell>
  );
}
