import { describe, expect, it } from 'bun:test';
import { BEHAVIOUR_NAMES, isBehaviour } from '../../src/body/behaviours';
import { isExpression } from '../../src/body/expressions';
import {
  AWAY_LOOK,
  clockScene,
  isNight,
  isScene,
  NIGHT_HOURS,
  noticedTarget,
  POINTER_ATTENTION,
  POINTER_REENGAGE_PX,
  pointerAttention,
  pointerReengages,
  resolveScene,
  resolveSceneLook,
  SCENE_NAMES,
  SCENES,
  SLEEPY_QUIET_MS,
  sceneBeatsBetween,
  sceneFrame,
  sceneHaptic,
  sceneInterrupts,
  sceneNote,
  sceneSpec,
  scenesForCue,
  type WoboScene,
} from '../../src/body/scenes';

describe('the scene registry', () => {
  it('has the ten the owner named, plus the two direct reactions', () => {
    expect(SCENE_NAMES).toEqual([
      'peek',
      'stretch',
      'followPointer',
      'notice',
      'penTap',
      'gotIt',
      'wave',
      'nod',
      'headShake',
      'sleepy',
      'hover',
      'press',
    ]);
    expect(SCENE_NAMES).toHaveLength(12);
  });

  it('starts every scene at zero and keeps its beats in order', () => {
    for (const name of SCENE_NAMES) {
      const beats = sceneSpec(name).beats;
      expect(beats.length).toBeGreaterThan(0);
      expect(beats[0]?.at).toBe(0);
      for (let i = 1; i < beats.length; i++) {
        expect(beats[i]?.at).toBeGreaterThan(beats[i - 1]?.at as number);
      }
    }
  });

  it('never outlives its last beat, and never ends before it', () => {
    for (const name of SCENE_NAMES) {
      const spec = sceneSpec(name);
      const last = spec.beats.at(-1)?.at as number;
      expect(spec.dur).toBeGreaterThan(last);
    }
  });

  it('names only real expressions and real behaviours', () => {
    for (const name of SCENE_NAMES) {
      for (const beat of sceneSpec(name).beats) {
        if (beat.expression) expect(isExpression(beat.expression)).toBe(true);
        if (beat.behaviour) expect(isBehaviour(beat.behaviour)).toBe(true);
      }
    }
  });

  it('uses the five behaviours wave 7a added, so none of them is dead weight', () => {
    const used = new Set<string>();
    for (const name of SCENE_NAMES) {
      for (const beat of sceneSpec(name).beats) if (beat.behaviour) used.add(beat.behaviour);
    }
    for (const added of ['wave', 'penTap', 'bounce', 'perk', 'drift']) {
      expect(BEHAVIOUR_NAMES).toContain(added as (typeof BEHAVIOUR_NAMES)[number]);
      expect(used.has(added)).toBe(true);
    }
  });

  it("keeps Wobo's notes in Wobo's voice — sentence case, no emoji, no exclamation marks", () => {
    for (const name of SCENE_NAMES) {
      const note = sceneNote(name);
      expect(note).not.toContain('!');
      expect(/\p{Extended_Pictographic}/u.test(note)).toBe(false);
      if (note) expect(note[0]).toBe((note[0] as string).toLowerCase());
    }
  });

  it('buzzes only where a finger actually touched Wobo', () => {
    const withHaptic = SCENE_NAMES.filter((n) => sceneHaptic(n) > 0);
    expect(withHaptic).toEqual(['press']);
    // Haptic-length: a tick you feel on the same beat you see, never a buzz.
    expect(sceneHaptic('press')).toBeLessThanOrEqual(20);
    expect(sceneHaptic('hover')).toBe(0);
  });

  it('groups the scenes under the cues the rest of the app speaks in', () => {
    expect(scenesForCue('meeting')).toEqual(['wave']);
    expect(scenesForCue('clock')).toEqual(['sleepy']);
    expect(scenesForCue('press')).toEqual(['press']);
    expect(scenesForCue('hover')).toEqual(['hover']);
    expect(scenesForCue('pointer')).toEqual(['followPointer']);
    expect(scenesForCue('idle')).toEqual(['stretch']);
    expect(scenesForCue('action')).toEqual([
      'peek',
      'notice',
      'penTap',
      'gotIt',
      'nod',
      'headShake',
    ]);
  });

  it('recognises its own names and nothing else', () => {
    expect(isScene('gotIt')).toBe(true);
    expect(isScene('moonwalk')).toBe(false);
  });
});

describe('cueing a scene by whatever the board called it', () => {
  it('takes the scene names straight through', () => {
    for (const name of SCENE_NAMES) expect(resolveScene(name)).toBe(name);
  });

  it('speaks the words a tutor action actually uses', () => {
    expect(resolveScene('hello')).toBe('wave');
    expect(resolveScene('greet')).toBe('wave');
    expect(resolveScene('yes')).toBe('nod');
    expect(resolveScene('confirm')).toBe('nod');
    expect(resolveScene('no')).toBe('headShake');
    expect(resolveScene('refuse')).toBe('headShake');
    expect(resolveScene('aha')).toBe('gotIt');
    expect(resolveScene('think')).toBe('penTap');
    expect(resolveScene('look')).toBe('notice');
    expect(resolveScene('night')).toBe('sleepy');
    expect(resolveScene('click')).toBe('press');
  });

  it('forgives case, spaces, hyphens and underscores', () => {
    expect(resolveScene('GOT IT')).toBe('gotIt');
    expect(resolveScene('head-shake')).toBe('headShake');
    expect(resolveScene('pen_tap')).toBe('penTap');
    expect(resolveScene('  Follow Pointer  ')).toBe('followPointer');
  });

  it('cues nothing rather than the wrong thing', () => {
    expect(resolveScene('moonwalk')).toBeNull();
    expect(resolveScene('')).toBeNull();
    expect(resolveScene(null)).toBeNull();
    expect(resolveScene(undefined)).toBeNull();
  });
});

describe('who wins when two scenes want Wobo at once', () => {
  it('lets anything start when nothing is running', () => {
    for (const name of SCENE_NAMES) expect(sceneInterrupts(name, null)).toBe(true);
  });

  it('puts a finger on Wobo above everything else, and the clock below everything', () => {
    expect(sceneInterrupts('press', 'gotIt')).toBe(true);
    expect(sceneInterrupts('press', 'sleepy')).toBe(true);
    expect(sceneInterrupts('sleepy', 'press')).toBe(false);
    expect(sceneInterrupts('stretch', 'notice')).toBe(false);
  });

  it('lets a scene finish rather than restarting it on a repeated cue', () => {
    expect(sceneInterrupts('nod', 'headShake')).toBe(false);
    expect(sceneInterrupts('nod', 'nod')).toBe(false);
  });
});

describe('playing a scene', () => {
  it('holds the first beat from the very start', () => {
    const f = sceneFrame('gotIt', 0);
    expect(f.index).toBe(0);
    expect(f.beat?.expression).toBe('aha');
    expect(f.done).toBe(false);
  });

  it('moves to each beat exactly at its own time', () => {
    expect(sceneFrame('gotIt', 619).index).toBe(0);
    expect(sceneFrame('gotIt', 620).index).toBe(1);
    expect(sceneFrame('gotIt', 1049).index).toBe(1);
    expect(sceneFrame('gotIt', 1050).index).toBe(2);
  });

  it('holds the last beat until the scene runs out', () => {
    const spec = sceneSpec('gotIt');
    expect(sceneFrame('gotIt', spec.dur - 1).beat?.expression).toBe('happy');
    expect(sceneFrame('gotIt', spec.dur - 1).done).toBe(false);
    expect(sceneFrame('gotIt', spec.dur).done).toBe(true);
    expect(sceneFrame('gotIt', spec.dur * 4).done).toBe(true);
  });

  it('hands a frame loop each beat exactly once, however uneven the frames are', () => {
    for (const name of SCENE_NAMES) {
      const spec = sceneSpec(name);
      const fired: number[] = [];
      let from = -1;
      // A deliberately lumpy clock: 7 ms, then 90 ms, then 400 ms, and round again.
      const steps = [7, 90, 400];
      for (let t = 0, i = 0; t <= spec.dur + 500; i++) {
        t += steps[i % steps.length] as number;
        for (const beat of sceneBeatsBetween(name as WoboScene, from, t)) fired.push(beat.at);
        from = t;
      }
      expect(fired).toEqual(spec.beats.map((b) => b.at));
    }
  });
});

describe('where a beat sends the gaze', () => {
  it('re-centres on ahead and looks off on away', () => {
    expect(resolveSceneLook('ahead', {})).toEqual([0, 0]);
    expect(resolveSceneLook('away', {})).toBe(AWAY_LOOK);
    // Away is off to one side and a little down — not a stare at nothing.
    expect(AWAY_LOOK[0]).toBeLessThan(0);
    expect(AWAY_LOOK[1]).toBeGreaterThan(0);
  });

  it('hands the gaze back to the pointer, and to the noticed element', () => {
    expect(resolveSceneLook('pointer', {})).toBe('pointer');
    expect(resolveSceneLook('pointer', { pointer: [3, 4] })).toEqual([3, 4]);
    expect(resolveSceneLook('target', { target: [11, -2] })).toEqual([11, -2]);
    // Nothing to notice reads as straight ahead rather than as a guess.
    expect(resolveSceneLook('target', {})).toEqual([0, 0]);
  });

  it('passes an explicit pair through, and has no opinion without one', () => {
    expect(resolveSceneLook([5, 6], {})).toEqual([5, 6]);
    expect(resolveSceneLook(undefined, {})).toBeNull();
  });
});

describe('following the pointer, then losing interest', () => {
  it('is engaged, then wanes, then gives up', () => {
    expect(pointerAttention(0)).toBe('engaged');
    expect(pointerAttention(POINTER_ATTENTION.waning - 1)).toBe('engaged');
    expect(pointerAttention(POINTER_ATTENTION.waning)).toBe('waning');
    expect(pointerAttention(POINTER_ATTENTION.lost - 1)).toBe('waning');
    expect(pointerAttention(POINTER_ATTENTION.lost)).toBe('lost');
    expect(pointerAttention(10 * 60_000)).toBe('lost');
  });

  it('lines the followPointer scene up with those exact thresholds', () => {
    const beats = sceneSpec('followPointer').beats;
    expect(beats[1]?.at).toBe(POINTER_ATTENTION.waning);
    expect(beats[2]?.at).toBe(POINTER_ATTENTION.lost);
    expect(beats[2]?.look).toBe('away');
    expect(beats[2]?.behaviour).toBe('drift');
  });

  it('wins Wobo back on a real jump, but not on a drift', () => {
    expect(pointerReengages(null, { x: 0, y: 0 })).toBe(true);
    expect(pointerReengages({ x: 0, y: 0 }, { x: 10, y: 10 })).toBe(false);
    expect(pointerReengages({ x: 0, y: 0 }, { x: POINTER_REENGAGE_PX, y: 0 })).toBe(true);
    expect(pointerReengages({ x: 0, y: 0 }, { x: 0, y: -POINTER_REENGAGE_PX - 1 })).toBe(true);
  });
});

describe('the learner’s own clock', () => {
  const at = (hour: number) => new Date(2026, 8, 2, hour, 30, 0);

  it('calls 21:00 through 05:59 night, wrapping midnight', () => {
    expect(NIGHT_HOURS).toEqual({ from: 21, until: 6 });
    expect(isNight(at(20))).toBe(false);
    expect(isNight(at(21))).toBe(true);
    expect(isNight(at(23))).toBe(true);
    expect(isNight(at(0))).toBe(true);
    expect(isNight(at(5))).toBe(true);
    expect(isNight(at(6))).toBe(false);
    expect(isNight(at(14))).toBe(false);
  });

  it('never yawns at a learner who is working hard at midnight', () => {
    expect(clockScene(at(23), 0)).toBeNull();
    expect(clockScene(at(23), SLEEPY_QUIET_MS - 1)).toBeNull();
    expect(clockScene(at(23), SLEEPY_QUIET_MS)).toBe('sleepy');
    // And a long quiet in the afternoon is not a night.
    expect(clockScene(at(14), 10 * 60_000)).toBeNull();
  });

  it('sanctions rest rather than guilting the learner for it', () => {
    expect(sceneNote('sleepy')).toBe('rest is part of learning');
  });
});

describe('noticing something new', () => {
  it('glances at the most recently registered target Wobo has not seen', () => {
    expect(noticedTarget(['a', 'b', 'c'], new Set())).toBe('c');
    expect(noticedTarget(['a', 'b', 'c'], new Set(['c']))).toBe('b');
    expect(noticedTarget(['a', 'b', 'c'], new Set(['b', 'c']))).toBe('a');
  });

  it('says nothing when there is nothing new — a re-measure must not re-fire the glance', () => {
    expect(noticedTarget(['a', 'b'], new Set(['a', 'b']))).toBeNull();
    expect(noticedTarget([], new Set())).toBeNull();
  });
});

describe('the scenes the owner asked for by name', () => {
  it('leans in from the edge to peek, and comes back', () => {
    const beats = SCENES.peek.beats;
    expect(beats[0]?.behaviour).toBe('peek');
    expect(beats[0]?.expression).toBe('peeking');
    expect(beats.at(-1)?.look).toBe('ahead');
  });

  it('stretches and then yawns after a long quiet', () => {
    const used = sceneSpec('stretch').beats.map((b) => b.behaviour);
    expect(used).toContain('stretch');
    expect(used).toContain('yawn');
    expect(SCENES.stretch.cue).toBe('idle');
  });

  it('taps the pen while thinking', () => {
    expect(SCENES.penTap.beats[0]?.expression).toBe('thinking');
    expect(SCENES.penTap.beats[0]?.behaviour).toBe('penTap');
  });

  it('sparks on got it and nowhere else in the twelve', () => {
    const sparking = SCENE_NAMES.filter((n) =>
      sceneSpec(n).beats.some((b) => b.expression === 'aha'),
    );
    expect(sparking).toEqual(['gotIt']);
  });

  it('waves on a first meeting only', () => {
    expect(SCENES.wave.cue).toBe('meeting');
    expect(SCENES.wave.beats[0]?.behaviour).toBe('wave');
    expect(sceneNote('wave')).toBe('hello');
  });

  it('nods yes and shakes no, and stays kind while it refuses', () => {
    expect(SCENES.nod.beats[0]?.behaviour).toBe('nod');
    expect(SCENES.headShake.beats[0]?.behaviour).toBe('shake');
    expect(SCENES.headShake.beats[0]?.expression).toBe('supportive');
    expect(SCENES.headShake.beats.at(-1)?.expression).toBe('encouraging');
  });

  it('bounces and winks when Wobo is tapped', () => {
    expect(SCENES.press.beats[0]?.expression).toBe('wink');
    expect(SCENES.press.beats[0]?.behaviour).toBe('bounce');
    expect(SCENES.press.cue).toBe('press');
  });

  it('leans in and listens on hover, without a body track fighting the lean', () => {
    const beats = sceneSpec('hover').beats;
    expect(beats).toHaveLength(1);
    expect(beats[0]?.expression).toBe('listening');
    expect(beats[0]?.behaviour).toBeUndefined();
  });
});
