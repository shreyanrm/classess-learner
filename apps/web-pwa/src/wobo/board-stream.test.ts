import { describe, expect, it } from 'bun:test';
import { type BoardTurnHandlers, dispatchFrame, parseEventId, SseParser } from './board-stream';

/**
 * The wire is the one place a dropped byte becomes a wrong drawing. These tests cut the stream at
 * every awkward place a network cuts it and insist that a half-frame is never delivered whole.
 */
describe('the SSE parser', () => {
  it('reads a whole frame', () => {
    const p = new SseParser();
    const frames = p.push('id: t1:0\nevent: say\ndata: {"type":"say","text":"hello"}\n\n');
    expect(frames).toHaveLength(1);
    expect(frames[0]).toEqual({
      id: 't1:0',
      event: 'say',
      data: '{"type":"say","text":"hello"}',
    });
  });

  it('ignores the keep-alive comment the gateway flushes first', () => {
    const p = new SseParser();
    expect(p.push(': open\n\n')).toEqual([]);
  });

  it('holds a frame split across chunk boundaries until it is whole', () => {
    const p = new SseParser();
    expect(p.push('event: ink\ndata: {"ty')).toEqual([]);
    expect(p.push('pe":"ink"}')).toEqual([]);
    const frames = p.push('\n\n');
    expect(frames).toHaveLength(1);
    expect(frames[0]?.data).toBe('{"type":"ink"}');
  });

  it('splits a chunk that carries several frames at once', () => {
    const p = new SseParser();
    const frames = p.push('data: {"a":1}\n\ndata: {"a":2}\n\ndata: {"a":3}\n\n');
    expect(frames.map((f) => f.data)).toEqual(['{"a":1}', '{"a":2}', '{"a":3}']);
  });

  it('handles CRLF and joins multi-line data with newlines', () => {
    const p = new SseParser();
    const frames = p.push('data: one\r\ndata: two\r\n\r\n');
    expect(frames[0]?.data).toBe('one\ntwo');
  });

  it('yields a frame that never got its blank line when the stream ends', () => {
    const p = new SseParser();
    expect(p.push('event: done\ndata: {"type":"done"}\n')).toEqual([]);
    const tail = p.flush();
    expect(tail).toHaveLength(1);
    expect(tail[0]?.event).toBe('done');
  });
});

describe('the resume token', () => {
  it('splits a turn id from its sequence', () => {
    expect(parseEventId('turn-9:14')).toEqual({ turnId: 'turn-9', seq: 14 });
  });
  it('keeps colons inside the turn id', () => {
    expect(parseEventId('a:b:c:3')).toEqual({ turnId: 'a:b:c', seq: 3 });
  });
  it('refuses anything it could not resume from', () => {
    for (const bad of [undefined, '', 'nope', 'turn:', 'turn:-1', 'turn:x', ':4']) {
      expect(parseEventId(bad)).toBeNull();
    }
  });
});

function collect() {
  const seen: string[] = [];
  const handlers: BoardTurnHandlers = {
    onSay: (text, t) => seen.push(`say:${text}@${t}`),
    onInk: (event) => seen.push(`ink:${event.object.id}`),
    onAction: () => seen.push('action'),
    onAsk: (prompt, targets) => seen.push(`ask:${prompt}:${targets.join(',')}`),
    onCard: () => seen.push('card'),
    onDone: (done) => seen.push(`done:${done.presentation}:${done.objects}`),
  };
  return { seen, handlers };
}

describe('dispatching a frame', () => {
  it('routes every event of the protocol', () => {
    const { seen, handlers } = collect();
    const frames = [
      '{"type":"say","t":0,"text":"Look at this.","dur":1090}',
      '{"type":"ink","t":120,"object":{"id":"v1","kind":"circle","anchor":{"target":"card-3"}}}',
      '{"type":"action","t":600,"action":{"type":"point"}}',
      '{"type":"ask","t":900,"prompt":"Where is it fastest?","targets":["v1"]}',
      '{"type":"card","t":950,"card":{"path":"component"}}',
      '{"type":"done","t":1200,"presentation":"plane","objects":2}',
    ];
    for (const data of frames) dispatchFrame({ data }, handlers);
    expect(seen).toEqual([
      'say:Look at this.@0',
      'ink:v1',
      'action',
      'ask:Where is it fastest?:v1',
      'card',
      'done:plane:2',
    ]);
  });

  it('drops a frame that is not valid JSON rather than guessing at it', () => {
    const { seen, handlers } = collect();
    dispatchFrame({ data: '{"type":"say","text":' }, handlers);
    expect(seen).toEqual([]);
  });

  it('refuses an ink object the grammar does not recognise — it never reaches the hand', () => {
    const { seen, handlers } = collect();
    dispatchFrame(
      { data: '{"type":"ink","t":0,"object":{"id":"v1","kind":"teleport"}}' },
      handlers,
    );
    expect(seen).toEqual([]);
  });

  it('refuses a number the verifier never passed, at the wire', () => {
    const { seen, handlers } = collect();
    // A `number` with no `verified` flag is not valid grammar: the law is enforced before the pen.
    dispatchFrame(
      {
        data: '{"type":"ink","t":0,"object":{"id":"n1","kind":"number","anchor":{"board":[0,0]},"value":25}}',
      },
      handlers,
    );
    expect(seen).toEqual([]);
  });

  it('takes the event name from the SSE field when the payload omits the type', () => {
    const { seen, handlers } = collect();
    dispatchFrame({ event: 'say', data: '{"t":4,"text":"here"}' }, handlers);
    expect(seen).toEqual(['say:here@4']);
  });
});
