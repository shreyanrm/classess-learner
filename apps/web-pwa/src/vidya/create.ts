/**
 * The `create` seam (VIDYA-CAPABILITIES.md §1, family C rows) — widening what Vidya can really MAKE
 * in the thread beyond a course or a deck: a one-page formula card for exam morning, a maker-project
 * plan, and a small drawn delight. Each is a real artifact rendered by TurnAttachments; the content
 * here is the honest offline floor (never fabricated formulas or facts), and the gateway supplies the
 * live-composed version when connected. Same register as the seed specs in ./paths/classify.
 */

import { blobPath, hash, rng } from '../ui/art';

// --- one-page formula card (family C: "give me a formula sheet for tomorrow") --------------------

export interface Formula {
  /** What it computes, e.g. "area of a circle". */
  name: string;
  /** The expression itself, e.g. "A = π r²". */
  expr: string;
  /** When to reach for it — one plain clause. */
  when?: string;
}
export interface FormulaCardSpec {
  title: string;
  formulas: Formula[];
  /** True when this is the offline method floor rather than the named chapter's own sheet. */
  seeded?: boolean;
  note?: string;
}

/**
 * A small bank of GENUINELY TRUE formulas, keyed by the words a learner uses. These are universal
 * (a circle's area is πr² on any board), so the offline card is real content, never an invention.
 * The named-chapter sheet composes online; this is the exam-morning floor.
 */
const FORMULA_BANK: { match: RegExp; title: string; formulas: Formula[] }[] = [
  {
    match: /\b(linear|equation|solve for x|both sides|transpos|atom)\b/,
    title: 'Solving linear equations',
    formulas: [
      { name: 'the balance law', expr: 'do the same to both sides', when: 'every single step' },
      {
        name: 'transpose a term',
        expr: 'move it across =, flip its sign',
        when: 'to gather x on one side',
      },
      { name: 'isolate x', expr: 'x = (c − b) ÷ a  for  a·x + b = c', when: 'the finishing move' },
      { name: 'check', expr: 'put x back in — both sides must match', when: 'before you trust it' },
    ],
  },
  {
    match: /\b(area|perimeter|mensuration|shape|circle|triangle|rectangle)\b/,
    title: 'Area & perimeter',
    formulas: [
      { name: 'rectangle', expr: 'A = l × b,  P = 2(l + b)' },
      { name: 'triangle', expr: 'A = ½ × base × height' },
      { name: 'circle', expr: 'A = π r²,  circumference = 2 π r' },
      { name: 'π', expr: 'π ≈ 3.14 (or 22/7)', when: 'anything round' },
    ],
  },
  {
    match: /\b(speed|motion|distance|velocity|kinematics)\b/,
    title: 'Speed & motion',
    formulas: [
      { name: 'speed', expr: 'speed = distance ÷ time' },
      { name: 'distance', expr: 'distance = speed × time' },
      { name: 'average speed', expr: 'total distance ÷ total time', when: 'over a whole journey' },
    ],
  },
  {
    match: /\b(percent|percentage|profit|loss|interest|discount)\b/,
    title: 'Percentage & money',
    formulas: [
      { name: 'percentage', expr: 'part ÷ whole × 100' },
      { name: 'profit %', expr: '(profit ÷ cost price) × 100' },
      { name: 'simple interest', expr: 'SI = (P × R × T) ÷ 100' },
    ],
  },
];

/** The universal method — real and useful for any topic when its own sheet isn't offline yet. */
const METHOD_FLOOR: Formula[] = [
  { name: 'name the unknown', expr: 'write down exactly what you are solving for' },
  { name: 'find the relation', expr: 'the one equation that ties knowns to the unknown' },
  { name: 'isolate & compute', expr: 'rearrange, then substitute the numbers' },
  { name: 'check', expr: 'does the answer survive being put back in?' },
];

export function seedFormulaCard(concept: string): FormulaCardSpec {
  const t = concept.toLowerCase();
  const hit = FORMULA_BANK.find((f) => f.match.test(t));
  if (hit) return { title: hit.title, formulas: hit.formulas, seeded: true };
  return {
    title: concept.length > 1 ? concept : 'your revision card',
    formulas: METHOD_FLOOR,
    seeded: true,
    note: "the method holds for anything — I'll pull this chapter's own formulas when we're online.",
  };
}

// --- maker-project plan (family C: "help me build …") --------------------------------------------

export interface MakerPlanSpec {
  title: string;
  materials: string[];
  steps: string[];
  safety: string[];
  /** Rough timeline, longest-lasting phase last, e.g. "gather · 10 min". */
  timeline: string[];
  seeded?: boolean;
}

/** Real, safe, buildable mini-projects — the offline floor. Everything here is genuinely doable. */
const PROJECT_BANK: { match: RegExp; plan: Omit<MakerPlanSpec, 'seeded'> }[] = [
  {
    match: /\b(volcano|eruption|baking soda)\b/,
    plan: {
      title: 'Baking-soda volcano',
      materials: [
        'baking soda (2 tbsp)',
        'vinegar (½ cup)',
        'dish soap (a squirt)',
        'a small bottle',
        'a tray to catch spills',
        'red food colour (optional)',
      ],
      steps: [
        'stand the bottle in the tray and mound clay or sand around it for the cone',
        'spoon the baking soda into the bottle',
        'add the dish soap and a few drops of colour',
        'pour the vinegar in and step back',
      ],
      safety: [
        'do it over a tray or outside — it foams over',
        'keep vinegar away from eyes',
        'wash hands after',
      ],
      timeline: ['gather · 10 min', 'build the cone · 15 min', 'erupt & repeat · 5 min'],
    },
  },
  {
    match: /\b(circuit|led|light|battery|electric)\b/,
    plan: {
      title: 'A simple lit circuit',
      materials: ['1 LED', 'a coin cell (3V)', 'tape', 'thin wire or foil strips'],
      steps: [
        'spread the LED’s two legs apart — the long leg is +',
        'tape the long leg to the + side of the cell',
        'run a wire from the − side back to the short leg',
        'press it closed — the LED lights',
      ],
      safety: [
        'a coin cell is safe, but never connect + straight to − with no LED (it heats up)',
        'never use mains electricity for this',
        'ask an adult before cutting wire',
      ],
      timeline: ['gather · 5 min', 'wire it · 10 min', 'test & tidy · 5 min'],
    },
  },
  {
    match: /\b(sundial|shadow|clock|sun)\b/,
    plan: {
      title: 'A paper sundial',
      materials: ['stiff paper or card', 'a straw or pencil', 'tape', 'a compass (for north)'],
      steps: [
        'push the straw upright through the centre of the card — that is the gnomon',
        'take it outside on a sunny day and point the straw at true north',
        'each hour, mark where the shadow falls and write the time',
        'by evening you have your own clock',
      ],
      safety: ['never look straight at the Sun', 'wear a hat if it is hot outside'],
      timeline: ['build · 15 min', 'mark hours · across one day', 'read it forever'],
    },
  },
];

export function seedMakerPlan(concept: string): MakerPlanSpec {
  const t = concept.toLowerCase();
  const hit = PROJECT_BANK.find((p) => p.match.test(t));
  if (hit) return { ...hit.plan, seeded: true };
  // an honest generic scaffold — a real planning framework, no invented specifics
  const title = concept.length > 1 ? concept : 'your build';
  return {
    title,
    materials: [
      'what you already have at home first',
      'one or two things to gather',
      'something to protect the table',
    ],
    steps: [
      'sketch what it should look like when done',
      'lay out every material before you start',
      'build the base first, details last',
      'test it, then improve the one thing that annoyed you',
    ],
    safety: [
      'an adult nearby for anything sharp, hot, or electric',
      'work over a surface you can wipe',
      'take a break if you feel rushed',
    ],
    timeline: ['plan · 10 min', 'build · 30–45 min', 'test & finish · 15 min'],
    seeded: true,
  };
}

// --- a small drawn delight (family H/C: "draw me a dragon") ---------------------------------------

export interface DoodleSpec {
  concept: string;
  /** One true fact hooked onto the delight — never made-up (VIDYA.md persona law). */
  fact?: string;
  /** Seed so the same ask redraws the same critter (until she re-inks it fresh). */
  seed?: number;
}

/** Genuinely true facts, keyed by the thing asked for; the fallback is true for any drawing. */
const TRUE_FACTS: { match: RegExp; fact: string }[] = [
  {
    match: /dragon|lizard|komodo/,
    fact: 'The Komodo dragon is the largest lizard alive — up to 3 metres, and it can smell carrion kilometres away.',
  },
  {
    match: /cat|kitten/,
    fact: 'A cat has 32 muscles in each ear and can swivel them almost 180°.',
  },
  {
    match: /dog|puppy/,
    fact: 'A dog’s sense of smell is tens of thousands of times sharper than ours.',
  },
  {
    match: /star|sun/,
    fact: 'The Sun is our nearest star — its light takes about 8 minutes 20 seconds to reach us.',
  },
  {
    match: /rocket|space/,
    fact: 'A rocket flies by Newton’s third law: throw gas down hard, get pushed up.',
  },
  {
    match: /fish|shark|whale/,
    fact: 'Fish breathe by pulling dissolved oxygen out of water across their gills.',
  },
  {
    match: /tree|plant|flower/,
    fact: 'A big tree can lift hundreds of litres of water a day from its roots to its leaves.',
  },
  {
    match: /bird|owl|eagle/,
    fact: 'Birds have hollow bones — light enough to fly, strong enough to hold shape.',
  },
  {
    match: /butterfly|insect|bug/,
    fact: 'A butterfly tastes with its feet before it decides to land.',
  },
];

export function trueFactFor(concept: string): string {
  const t = concept.toLowerCase();
  const hit = TRUE_FACTS.find((f) => f.match.test(t));
  if (hit) return hit.fact;
  // still true for literally any shape you can draw
  return 'Every triangle you can draw — however wonky — has three angles that add up to exactly 180°.';
}

export function seedDoodle(concept: string): DoodleSpec {
  const c = concept.length > 1 ? concept : 'a little creature';
  return { concept: c, fact: trueFactFor(c), seed: hash(c) };
}

/** A friendly seeded critter drawn in her hand — one generator, a different creature per seed. */
export interface DoodleArt {
  viewBox: string;
  body: string;
  belly: string;
  spikes: string;
  tail: string;
  legs: string[];
  eye: { cx: number; cy: number };
}

export function buildDoodle(seed: number): DoodleArt {
  const r = rng(seed);
  const cx = 62;
  const cy = 64;
  const rx = 30 + r() * 8;
  const ry = 22 + r() * 6;
  const body = blobPath(cx, cy, rx, ry, seed, 9, 0.14);
  const belly = blobPath(cx, cy + ry * 0.35, rx * 0.6, ry * 0.5, seed + 7, 7, 0.1);
  // a ridge of spikes along the back, count and height seeded
  const n = 3 + Math.floor(r() * 4);
  let spikes = '';
  for (let i = 0; i < n; i++) {
    const px = cx - rx * 0.7 + (i / (n - 1)) * rx * 1.4;
    const py = cy - ry + 2;
    const h = 6 + r() * 8;
    const w = 4 + r() * 3;
    spikes += `M ${(px - w).toFixed(1)} ${py.toFixed(1)} Q ${px.toFixed(1)} ${(py - h).toFixed(1)} ${(px + w).toFixed(1)} ${py.toFixed(1)} `;
  }
  // a curling tail off one side
  const tx = cx + rx * 0.9;
  const tail = `M ${tx.toFixed(1)} ${cy.toFixed(1)} q ${(14 + r() * 8).toFixed(1)} ${(-4).toFixed(1)} ${(10).toFixed(1)} ${(-16 - r() * 6).toFixed(1)}`;
  const legY = cy + ry * 0.9;
  const legs = [cx - rx * 0.45, cx + rx * 0.2].map((lx) =>
    blobPath(lx, legY, 6, 9, seed + Math.round(lx), 6, 0.12),
  );
  const eye = { cx: cx - rx * 0.55, cy: cy - ry * 0.25 };
  return { viewBox: '0 0 124 108', body, belly, spikes, tail, legs, eye };
}
