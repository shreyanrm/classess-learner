import { describe, expect, it } from 'bun:test';
import type { SimSpec } from '@wobo/contracts/plexus';
import { parseSimSpec, simSpecFromGateway } from './SimRunner';

/**
 * `SimSpec` names exactly one thing: the engine.simulate WIRE contract, generated from the schema.
 * SimRunner used to declare a second, different interface under the same name — the render model —
 * so "the SimSpec" meant two incompatible shapes depending on which file you were reading, and
 * neither one was checked against the other. The render model is now `SimScene`, and this adapter
 * is the single crossing between them.
 */
const wire: SimSpec = {
  params: [
    { name: 'I', min: 0, max: 5, default: 1, unit: 'A' },
    { name: 'R', min: 1, max: 100, default: 10, unit: 'ohm' },
  ],
  formula: 'V = I * R',
  outputs: ['V'],
  breakpoints: [{ param: 'R', at: 80, why: 'the wire melts before this' }],
  layout: 'sliders',
};

describe('the one adapter from the wire contract to the render model', () => {
  it('accepts a spec typed by the generated contract', () => {
    const scene = simSpecFromGateway(wire, 'Ohm’s law');
    expect(scene).not.toBeNull();
    expect(scene?.title).toBe('Ohm’s law');
    expect(scene?.law).toBe('V = I * R');
  });

  it('turns wire params into render params — name becomes id and label, default becomes initial', () => {
    const scene = simSpecFromGateway(wire, 'Ohm’s law');
    expect(scene?.params).toEqual([
      { id: 'I', label: 'I', min: 0, max: 5, initial: 1, unit: 'A' },
      { id: 'R', label: 'R', min: 1, max: 100, initial: 10, unit: 'ohm' },
    ]);
  });

  it('solves the formula into an expression over the params', () => {
    const scene = simSpecFromGateway(wire, 't');
    expect(scene?.outputs).toEqual([{ id: 'V', label: 'V', expr: 'I * R' }]);
  });

  it('turns a bare breakpoint into a comparison the runner can evaluate', () => {
    const scene = simSpecFromGateway(wire, 't');
    expect(scene?.breakpoints).toEqual([
      { param: 'R', op: '>=', value: 80, note: 'the wire melts before this' },
    ]);
  });

  it('reads the same spec through the plexus serve envelope', () => {
    const scene = simSpecFromGateway({ artifact: wire, verified: true }, 't');
    expect(scene?.outputs?.[0]?.expr).toBe('I * R');
  });

  it('refuses a formula that is not in solved form, rather than rendering a wrong sim', () => {
    expect(simSpecFromGateway({ ...wire, formula: 'V + I = R' }, 't')).toBeNull();
    expect(simSpecFromGateway({ ...wire, formula: 'V' }, 't')).toBeNull();
    expect(simSpecFromGateway({ ...wire, outputs: [] }, 't')).toBeNull();
  });

  it('refuses a non-object outright', () => {
    for (const bad of [null, undefined, 'sim', 42]) {
      expect(simSpecFromGateway(bad, 't')).toBeNull();
    }
  });

  it('the render model still parses on its own, for the seeded path', () => {
    const scene = parseSimSpec({
      id: 'seed',
      title: 'a line',
      params: [{ id: 'm', label: 'slope', min: -5, max: 5, initial: 1 }],
      outputs: [{ id: 'y', label: 'y', expr: 'm * 2' }],
    });
    expect(scene?.outputs?.[0]?.expr).toBe('m * 2');
  });
});
