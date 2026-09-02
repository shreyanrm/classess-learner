import { describe, expect, it } from 'bun:test';
import type { WoboAction, WoboBus, WoboMood } from '@classess/wobo';
import { onceCallback, performTurn, sentences, speakLine } from './speech';

describe('the sentence splitter — where a period really ends a breath', () => {
  it('keeps decimals in one piece', () => {
    expect(sentences('π is about 3.14 for our purposes.')).toEqual([
      'π is about 3.14 for our purposes.',
    ]);
    expect(sentences('Version 1.2.3 shipped. Then we moved on.')).toEqual([
      'Version 1.2.3 shipped.',
      'Then we moved on.',
    ]);
  });

  it('keeps abbreviations and initials in one piece', () => {
    expect(sentences('Take a solid, e.g. ice, and warm it.')).toEqual([
      'Take a solid, e.g. ice, and warm it.',
    ]);
    expect(sentences('Dr. Rao showed this first.')).toEqual(['Dr. Rao showed this first.']);
    expect(sentences('Bring a ruler, a pen, etc. Then we start.')).toEqual([
      'Bring a ruler, a pen, etc. Then we start.',
    ]);
  });

  it('still breaks on a real sentence end, a question, an exclamation and a newline', () => {
    expect(sentences('That holds. Why does it hold? Because both sides moved!')).toEqual([
      'That holds.',
      'Why does it hold?',
      'Because both sides moved!',
    ]);
    expect(sentences('First line\nSecond line')).toEqual(['First line', 'Second line']);
  });

  it("keeps the intro's short opening sentence as its own beat (first audio stays fast)", () => {
    expect(sentences('Hey there. I can see the page you are on, so just ask.')).toEqual([
      'Hey there.',
      'I can see the page you are on, so just ask.',
    ]);
  });

  it('never returns nothing for a line with no punctuation at all', () => {
    expect(sentences('no punctuation here')).toEqual(['no punctuation here']);
  });
});

describe('onDone is guaranteed, and guaranteed once', () => {
  it('a once-guard runs the callback exactly one time', () => {
    let n = 0;
    const finish = onceCallback(() => n++);
    finish();
    finish();
    finish();
    expect(n).toBe(1);
    expect(() => onceCallback(undefined)()).not.toThrow(); // no callback is still safe
  });

  it('a line that cannot be spoken still releases the gate exactly once', async () => {
    let n = 0;
    await speakLine('she is on screen either way', { onDone: () => n++ });
    expect(n).toBe(1); // keyless/muted: the advance button must never stay locked
  });

  it('an empty line releases the gate too', async () => {
    let n = 0;
    await speakLine('   ', { onDone: () => n++ });
    expect(n).toBe(1);
  });
});

/** A bus that just records what the performance asked for. */
function recordingBus() {
  const beats: { actions: WoboAction[]; opts?: { noteDurationMs?: number } }[] = [];
  let turns = 0;
  const bus: Pick<WoboBus, 'addBeat' | 'beginTurn'> = {
    addBeat: (actions, opts) => {
      beats.push({ actions, opts });
    },
    beginTurn: () => {
      turns++;
    },
  };
  return { bus, beats, turnCount: () => turns };
}

describe('performTurn — one performance, every beat once', () => {
  it('fires each anchored beat exactly once and opens exactly one turn', async () => {
    const { bus, beats, turnCount } = recordingBus();
    const actions = [
      { type: 'highlight', targetId: 'a', withSentence: 0 },
      { type: 'annotate', targetId: 'b', mark: 'underline', afterSentence: 0 },
      { type: 'say', text: 'and that is why', afterSentence: 1 },
    ] as unknown as WoboAction[];
    const moods: WoboMood[] = [];

    await performTurn('Take three. Now double it.', actions, bus, {
      onMood: (m) => moods.push(m),
    });

    expect(turnCount()).toBe(1);
    // the finally-flush used to replay every afterSentence beat after a completed performance
    expect(beats.length).toBe(3);
    const targets = beats.flatMap((b) => b.actions.map((a) => JSON.stringify(a)));
    expect(new Set(targets).size).toBe(3); // no duplicates
    expect(moods).toEqual([]);
  }, 30000);
});
