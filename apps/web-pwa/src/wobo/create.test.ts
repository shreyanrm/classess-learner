import { describe, expect, it } from 'bun:test';
import { buildDoodle, seedDoodle, seedFormulaCard, seedMakerPlan, trueFactFor } from './create';
import { classifyLocal } from './paths/classify';

describe('create seeds (the widened `create` artifacts — honest offline floors)', () => {
  it('formula card returns real, non-empty formulas for a known topic', () => {
    const card = seedFormulaCard('area of a circle');
    expect(card.title).toBe('Area & perimeter');
    expect(card.formulas.some((f) => f.expr.includes('π r²'))).toBe(true);
  });

  it('formula card never fabricates — an unknown topic falls to the universal method, flagged seeded', () => {
    const card = seedFormulaCard('quantum chromodynamics');
    expect(card.seeded).toBe(true);
    expect(card.note).toBeDefined();
    // the method floor is real problem-solving structure, not invented symbolic formulas
    expect(card.formulas.map((f) => f.name)).toContain('name the unknown');
  });

  it('maker plan carries materials, steps, safety and timeline for a known build', () => {
    const plan = seedMakerPlan('a baking soda volcano');
    expect(plan.title).toBe('Baking-soda volcano');
    expect(plan.materials.length).toBeGreaterThan(0);
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.safety.length).toBeGreaterThan(0);
    expect(plan.timeline.length).toBeGreaterThan(0);
  });

  it('doodle hooks on a genuinely true fact, and the fallback is still true', () => {
    expect(trueFactFor('dragon')).toContain('Komodo');
    expect(trueFactFor('a wibble')).toContain('180°'); // triangle angle sum — true for any drawing
  });

  it('doodle art is deterministic per seed and always a valid path', () => {
    const d = seedDoodle('dragon');
    const a = buildDoodle(d.seed ?? 1);
    const b = buildDoodle(d.seed ?? 1);
    expect(a.body).toBe(b.body); // same ask redraws the same critter
    expect(a.body.startsWith('M')).toBe(true);
    expect(a.legs.length).toBe(2);
  });
});

describe('classifyLocal routes the create asks to the component path with the right kind + concept', () => {
  it('routes a formula-sheet ask and extracts the subject', () => {
    const c = classifyLocal('give me a formula sheet for trigonometry');
    expect(c.path).toBe('component');
    expect(c.componentKind).toBe('formula');
    expect(c.concept).toBe('trigonometry');
  });

  it('routes a maker ask and extracts the build', () => {
    const c = classifyLocal('help me build a volcano');
    expect(c.componentKind).toBe('maker');
    expect(c.concept).toContain('volcano');
  });

  it('routes a delight ask to doodle (not the diagram visualization)', () => {
    const c = classifyLocal('draw me a dragon');
    expect(c.path).toBe('component');
    expect(c.componentKind).toBe('doodle');
    expect(c.concept).toBe('dragon');
  });

  it('a real diagram ask still goes to visualization, not doodle', () => {
    const c = classifyLocal('draw a diagram of the water cycle');
    expect(c.path).toBe('visualization');
  });

  it('"draw me a concept map" is a visualization, not a doodle (guarded)', () => {
    const c = classifyLocal('draw me a concept map of photosynthesis');
    expect(c.path).toBe('visualization');
    expect(c.vizKind).toBe('conceptmap');
  });
});
