import { beforeEach, describe, expect, it } from 'bun:test';
import { SurfaceRegistry } from '@wobo/wobo';
import {
  ARMED_TTL_MS,
  armDoIt,
  armedAction,
  disarm,
  findTargetId,
  glideAt,
  glideDurationMs,
  glideEase,
  isConfirmation,
  isDecline,
  permissionFor,
  runsWithoutAsking,
  showMe,
  tapPoint,
} from './hands';

describe('the permission ladder', () => {
  it('always asks before anything that communicates, buys, submits or deletes', () => {
    for (const action of [
      'send the parent note',
      'share this board',
      'buy the plan',
      'submit the answer',
      'delete my account',
      'forget everything Wobo knows about you',
      'sign out',
    ]) {
      expect(permissionFor(action)).toBe('execute_with_permission');
      expect(runsWithoutAsking(action)).toBe(false);
    }
  });

  it("lets Wobo do the reversible, harmless things on Wobo's own", () => {
    for (const action of [
      'open the atom course',
      'show the chapter list',
      'go to practice',
      'scroll to the next card',
    ]) {
      expect(permissionFor(action)).toBe('safe_automatic');
      expect(runsWithoutAsking(action)).toBe(true);
    }
  });

  it('asks when it is not sure — an unknown verb is never automatic', () => {
    expect(permissionFor('frobnicate the widget')).toBe('execute_with_permission');
  });

  it('asks even when a harmless word sits beside a consequential one', () => {
    expect(runsWithoutAsking('open the share sheet and send it')).toBe(false);
  });
});

describe('the prepared rung', () => {
  beforeEach(() => disarm());

  it('holds exactly what Wobo offered, and nothing runs until the learner says go ahead', () => {
    armDoIt('course-advance', 'the continue button');
    expect(armedAction()?.targetId).toBe('course-advance');
    expect(isConfirmation('go ahead')).toBe(true);
    expect(isConfirmation('yes please')).toBe(true);
    expect(isConfirmation('what does that mean')).toBe(false);
  });

  it('honours a no', () => {
    expect(isDecline('no')).toBe(true);
    expect(isDecline('not now')).toBe(true);
    expect(isDecline('nothing else')).toBe(false);
  });

  it('expires rather than lingering as a trap', () => {
    const at = 1_000_000;
    armDoIt('t', 'a thing', at);
    expect(armedAction(at + ARMED_TTL_MS - 1)).not.toBeNull();
    expect(armedAction(at + ARMED_TTL_MS + 1)).toBeNull();
    expect(armedAction(at)).toBeNull(); // an expired offer is dropped, not resurrected
  });
});

describe('the glide', () => {
  it('taps the middle of the control, where a person would', () => {
    expect(tapPoint({ x: 10, y: 20, width: 100, height: 40 })).toEqual({ x: 60, y: 40 });
  });

  it('sets off, travels and settles — never a linear tween', () => {
    expect(glideEase(0)).toBe(0);
    expect(glideEase(1)).toBe(1);
    expect(glideEase(0.5)).toBeCloseTo(0.5, 5);
    expect(glideEase(0.25)).toBeLessThan(0.25); // slow away from rest
    expect(glideEase(0.75)).toBeGreaterThan(0.75); // and slow into it
  });

  it('clamps a fraction that ran past its ends', () => {
    expect(glideEase(-3)).toBe(0);
    expect(glideEase(9)).toBe(1);
  });

  it('travels the whole way and no further', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 50 };
    expect(glideAt(from, to, 0)).toEqual(from);
    expect(glideAt(from, to, 1)).toEqual(to);
  });

  it('is slower for a longer trip, and never slow', () => {
    expect(glideDurationMs(0)).toBeGreaterThanOrEqual(320);
    expect(glideDurationMs(2000)).toBeLessThanOrEqual(1100);
    expect(glideDurationMs(600)).toBeGreaterThan(glideDurationMs(100));
  });

  it('arrives instantly under reduced motion, and still taps', () => {
    expect(glideDurationMs(900, true)).toBe(0);
  });
});

describe('finding the control Wobo was asked about', () => {
  const registry = () => {
    const r = new SurfaceRegistry();
    r.registerSurface({
      id: 'course',
      title: 'the course player',
      targets: [
        {
          id: 'course-advance',
          kind: 'control',
          label: 'the continue button — it moves the lesson on',
          rect: () => ({ x: 0, y: 0, width: 10, height: 10 }),
        },
        {
          id: 'home-composer',
          kind: 'composer',
          label: 'the box where you talk to Wobo',
          rect: () => ({ x: 0, y: 0, width: 10, height: 10 }),
        },
      ],
    });
    return r;
  };

  it('takes an exact id first', () => {
    expect(findTargetId('course-advance', registry())).toBe('course-advance');
  });

  it('resolves the words a learner would use', () => {
    expect(findTargetId('the continue button', registry())).toBe('course-advance');
    expect(findTargetId('the box where I talk to Wobo', registry())).toBe('home-composer');
  });

  it('says nothing rather than pointing at the wrong thing', () => {
    expect(findTargetId('the microscope', registry())).toBeNull();
    expect(findTargetId('   ', registry())).toBeNull();
  });
});

/**
 * "Show me" resolves a tap point, glides to it for up to 1.1 s, and then presses what is there. A
 * scroll or a layout shift during that second leaves the point over something else entirely — the
 * one place in the hand where a coordinate can outlive its layout. So the target is re-read on
 * arrival, and what is pressed has to belong to it.
 */
describe('showing the learner a control', () => {
  const registry = new SurfaceRegistry();

  it('presses the target itself when nothing is under the point it travelled to', async () => {
    let pressed = 0;
    const el = { click: () => (pressed += 1), contains: () => false } as unknown as Element;
    let where = { x: 100, y: 100, width: 80, height: 30 };
    registry.registerSurface({
      id: 's',
      title: 'a screen',
      targets: [
        {
          id: 'next',
          kind: 'button',
          label: 'next',
          rect: () => where,
          element: () => el,
        },
      ],
    });
    // The page scrolls while Wobo is on Wobo's way: the point Wobo set off towards is now empty.
    where = { x: 100, y: 700, width: 80, height: 30 };
    const result = await showMe('next', { registry, reduced: true });
    expect(result.ok).toBe(true);
    expect(pressed).toBe(1);
  });

  it('says so rather than guessing when the target is not on screen at all', async () => {
    const empty = new SurfaceRegistry();
    empty.registerSurface({
      id: 's',
      title: 'a screen',
      targets: [{ id: 'gone', kind: 'button', label: 'gone', rect: () => null }],
    });
    const result = await showMe('gone', { registry: empty, reduced: true });
    expect(result.ok).toBe(false);
    expect(result.say).toContain('not on screen');
  });
});
