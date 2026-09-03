import { describe, expect, it } from 'bun:test';
import {
  controlAria,
  drawAria,
  expressionKeyAria,
  lassoPartAria,
  matchLeftAria,
  matchRightAria,
  orderItemAria,
  orderListAria,
  padDisplayAria,
  padKeyAria,
  planeAria,
  pointAria,
  shadeAria,
  sliderAria,
  speakNumber,
  speakPoint,
  stateReadout,
  visualGroupAria,
  visualOptionAria,
} from '../../src/answers/a11y';
import {
  CHOOSE_HALF,
  MATCH_UNITS,
  ORDER_STEPS,
  PAD_VALUE,
  PLACE_LINE,
  PLACE_PLANE,
  SAMPLE_SPECS,
  SHADE_HALF,
  SLIDER_ANGLE,
} from '../../src/answers/samples';
import { resetState } from '../../src/answers/state';

describe('numbers and coordinates, spoken', () => {
  it('drops the noise a float leaves behind', () => {
    expect(speakNumber(0.1 + 0.2)).toBe('0.3');
    expect(speakNumber(90)).toBe('90');
    expect(speakNumber(1.23456, 2)).toBe('1.23');
    expect(speakNumber(Number.NaN)).toBe('no value');
  });

  it('says one number on a line and two on a plane', () => {
    expect(speakPoint([2, 3], false)).toBe('2, 3');
    expect(speakPoint([0.75, 0], true)).toBe('0.75');
  });
});

describe('every part of a control has a role, and the role is the right one', () => {
  it('a shadeable part is a checkbox that knows its place in the figure', () => {
    const aria = shadeAria(SHADE_HALF, { kind: 'shade_regions', shaded: [2] }, 2);
    expect(aria.role).toBe('checkbox');
    expect(aria['aria-checked']).toBe(true);
    expect(aria['aria-label']).toBe('part 3 of 8');
    expect(aria['aria-setsize']).toBe(8);
    expect(shadeAria(SHADE_HALF, { kind: 'shade_regions', shaded: [] }, 0)['aria-checked']).toBe(
      false,
    );
  });

  it('a plane says which keys it answers to, so the contract is discoverable', () => {
    const aria = planeAria(PLACE_PLANE);
    expect(aria.role).toBe('application');
    expect(aria['aria-keyshortcuts']).toContain('Enter');
    expect(aria['aria-description']).toContain('arrow keys');
    expect(planeAria(PLACE_LINE)['aria-label']).toBe('Mark three quarters');
  });

  it('a dropped point is named by where it is', () => {
    expect(pointAria(PLACE_PLANE, [2, 3], 0, 2)['aria-label']).toBe('point at 2, 3');
    expect(pointAria(PLACE_LINE, [0.75, 0], 0, 1)['aria-label']).toBe('point at 0.75');
  });

  it('the slider is a slider, with the whole value contract on it', () => {
    const aria = sliderAria(SLIDER_ANGLE, { kind: 'slider', value: 45 });
    expect(aria).toMatchObject({
      role: 'slider',
      'aria-valuemin': 0,
      'aria-valuemax': 180,
      'aria-valuenow': 45,
      'aria-valuetext': '45 degrees',
      'aria-orientation': 'horizontal',
    });
  });

  it('an untouched slider still reports where its thumb is drawn', () => {
    expect(sliderAria(SLIDER_ANGLE, { kind: 'slider', value: null })['aria-valuenow']).toBe(90);
  });

  it('the cards are a listbox, and each one says its position out loud', () => {
    expect(orderListAria(ORDER_STEPS)).toMatchObject({
      role: 'listbox',
      'aria-orientation': 'vertical',
    });
    expect(orderListAria(ORDER_STEPS)['aria-keyshortcuts']).toContain('Alt+');
    const item = orderItemAria('Check the answer', 2, 3, true);
    expect(item).toMatchObject({
      role: 'option',
      'aria-label': 'Check the answer, position 3 of 3',
      'aria-selected': true,
    });
  });

  it('a match column says what it is joined to, not merely that it is joined', () => {
    const state = { kind: 'match' as const, links: [{ left: 'mass', right: 'kilogram' }] };
    expect(matchLeftAria(MATCH_UNITS, state, 'mass', 'Mass', null)['aria-label']).toBe(
      'Mass, joined to Kilogram',
    );
    expect(matchLeftAria(MATCH_UNITS, state, 'force', 'Force', null)['aria-label']).toBe(
      'Force, not joined',
    );
    expect(matchLeftAria(MATCH_UNITS, state, 'mass', 'Mass', 'mass')['aria-pressed']).toBe(true);
  });

  it('a right-hand item becomes a landing place only once something is picked up', () => {
    expect(matchRightAria('Joule', null)['aria-disabled']).toBe(true);
    expect(matchRightAria('Joule', 'energy')['aria-label']).toBe('join to Joule');
  });

  it('a pad key is named by a word, never by its glyph alone', () => {
    expect(padKeyAria('-')['aria-label']).toBe('minus');
    expect(padKeyAria('/')['aria-label']).toBe('fraction bar');
    expect(padKeyAria('.')['aria-label']).toBe('decimal point');
    expect(padKeyAria('7')['aria-label']).toBe('7');
  });

  it('the pad display is a live status that reads the value as a person would say it', () => {
    const aria = padDisplayAria(PAD_VALUE, { kind: 'number_pad', entry: '-12.5' });
    expect(aria.role).toBe('status');
    expect(aria['aria-label']).toBe('your answer: minus 12 point 5 degrees');
    expect(padDisplayAria(PAD_VALUE, { kind: 'number_pad', entry: '' })['aria-label']).toContain(
      'empty',
    );
  });

  it('a maths key is named by its meaning', () => {
    expect(expressionKeyAria('fraction')['aria-label']).toBe('fraction');
    expect(expressionKeyAria('root')['aria-label']).toBe('square root');
    expect(expressionKeyAria('r')['aria-label']).toBe('r');
  });

  it('a drawing surface says both ways in, so neither hand is a second-class one', () => {
    const aria = drawAria(SAMPLE_SPECS.find((s) => s.kind === 'draw') as never);
    expect(aria.role).toBe('application');
    expect(aria['aria-description']).toContain('arrow keys');
  });

  it('a circleable part is a checkbox, so the keyboard path is a real one', () => {
    expect(lassoPartAria('nucleus', true)).toEqual({
      role: 'checkbox',
      'aria-checked': true,
      'aria-label': 'nucleus',
    });
  });

  it('drawn options are radios when there is one answer and checkboxes when there are several', () => {
    const empty = { kind: 'choose_visual' as const, selected: [] };
    expect(visualGroupAria(CHOOSE_HALF).role).toBe('radiogroup');
    expect(visualOptionAria(CHOOSE_HALF, empty, 'a', 'a bar').role).toBe('radio');
    const multi = { ...CHOOSE_HALF, multi: true };
    expect(visualGroupAria(multi)).toMatchObject({ role: 'group', 'aria-multiselectable': true });
    expect(visualOptionAria(multi, empty, 'a', 'a bar').role).toBe('checkbox');
  });

  it('falls back to a stated label when the item carries no prompt', () => {
    expect(controlAria({ ...SHADE_HALF, prompt: undefined }, 'shade the parts')['aria-label']).toBe(
      'shade the parts',
    );
  });
});

describe('the readout', () => {
  it('says what the control holds, for every kind, without judging it', () => {
    for (const spec of SAMPLE_SPECS) {
      const text = stateReadout(spec, resetState(spec));
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain('correct');
      expect(text).not.toContain('wrong');
    }
  });

  it('counts what is on the figure', () => {
    expect(stateReadout(SHADE_HALF, { kind: 'shade_regions', shaded: [0, 1] })).toBe(
      '2 of 8 parts shaded',
    );
  });

  it('reads the points back, in the space they were placed in', () => {
    expect(
      stateReadout(PLACE_PLANE, {
        kind: 'place_points',
        points: [
          [1, 2],
          [3, 4],
        ],
      }),
    ).toBe('1, 2; 3, 4');
    expect(stateReadout(PLACE_LINE, { kind: 'place_points', points: [[0.75, 0]] })).toBe('0.75');
  });

  it('says nothing at all when the state does not belong to the spec', () => {
    expect(stateReadout(SHADE_HALF, { kind: 'slider', value: 1 })).toBe('nothing yet');
  });
});
