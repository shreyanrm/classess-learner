/**
 * Classess Learner design tokens — the locked source of truth (docs/02-DESIGN/00-design-system.md).
 *
 * The governing idea: black and white is the world before you understand something; color is
 * what understanding looks like. Chrome/type/canvas are monochrome; color is earned (ignite) and
 * belongs to concepts, never decoration. There is NO signature brand hue. The one exception:
 * Molten (#FF4D1A) is Vidya's identity color and is reserved for her alone.
 *
 * Depth is never a drop shadow. It is tone, 0.5px hairlines, and frost (backdrop blur on overlays).
 */

// --- Neutrals: true black & white, no warm/clay tint --------------------------------------------
export const ink = {
  900: '#0A0A0B',
  800: '#161617',
  700: '#2A2A2C',
  500: '#6B6B70',
  300: '#B8B8BD',
  100: '#E9E9EC',
} as const;

export const paper = '#FFFFFF';
export const canvas = '#FAFAFA';

/** Dark surfaces step tonally (no shadows) as small lightness steps. */
export const surface = {
  1: '#161617',
  2: '#1E1E20',
  3: '#26262A',
  4: '#303034',
} as const;

/** Hairline borders (depth without shadow). */
export const hairline = {
  onPaper: 'rgba(10,10,11,0.08)',
  onDark: 'rgba(255,255,255,0.10)',
} as const;

// --- Content-color playground: earned, one hue per concept/subject ------------------------------
/**
 * The 14 named accents plus one open slot for a future subject. Each subject/concept is assigned
 * exactly one accent; that hue is what its nodes ignite into. Molten is RESERVED for Vidya and is
 * never assigned as a subject accent (see `subjectAccents`).
 */
export const accent = {
  cobalt: '#1E6BFF',
  indigo: '#4B41E0',
  violet: '#7A2FF2',
  grape: '#A82FE0',
  magenta: '#DD1E9A',
  rose: '#F4356E',
  hotRed: '#EC1C2D',
  molten: '#FF4D1A',
  tangerine: '#FF8A00',
  amber: '#FFB020',
  acid: '#C2F000',
  emerald: '#10A37A',
  tiffany: '#0FC2C0',
  cyan: '#00B5D8',
} as const;

export type AccentName = keyof typeof accent;

/** Molten is Vidya's identity color — reserved, never a subject accent. */
export const vidyaMolten = accent.molten;

/** Accents assignable to subjects/concepts (Molten excluded — it is Vidya's). */
export const subjectAccents = (Object.keys(accent) as AccentName[]).filter(
  (name): name is Exclude<AccentName, 'molten'> => name !== 'molten',
);

// --- Shape: subtle corners; larger radii only for Vidya's jelly and panel ------------------------
export const radius = {
  sm: 2,
  md: 8,
  lg: 16,
  /** Vidya's round squircle jelly. */
  jelly: 9999,
  /** Vidya's frosted floating panel and other overlays. */
  panel: 24,
} as const;

// --- Frost (backdrop blur) — overlays ONLY (Vidya panel, modals, the meter sheet) ----------------
export const frost = {
  blur: '20px',
  onPaper: 'rgba(255,255,255,0.72)',
  onDark: 'rgba(20,20,22,0.64)',
} as const;

// --- Spacing: European-spacey, 8px base grid (4px half-step) -------------------------------------
export const space = {
  0: 0,
  half: 4,
  1: 8,
  2: 16,
  3: 24,
  4: 32,
  6: 48,
  8: 64,
  12: 96,
  16: 128,
} as const;

// --- Type: Google Sans Flex (web stand-in Plus Jakarta Sans), Caveat for handwritten. No mono. ----
export const fontFamily = {
  display: "'Google Sans Flex', 'Plus Jakarta Sans', system-ui, sans-serif",
  system: "'Google Sans Flex', 'Plus Jakarta Sans', system-ui, sans-serif",
  handwritten: "'Caveat', cursive",
} as const;

/** Fluid type scale (clamp). Sentence case everywhere; generous line-height. */
export const typeScale = {
  display: { size: 'clamp(2.5rem, 1.8rem + 3.5vw, 4rem)', lineHeight: 1.05, weight: 600 },
  h1: { size: 'clamp(2rem, 1.5rem + 2.5vw, 3rem)', lineHeight: 1.1, weight: 600 },
  h2: { size: 'clamp(1.5rem, 1.2rem + 1.5vw, 2rem)', lineHeight: 1.15, weight: 600 },
  h3: { size: 'clamp(1.25rem, 1.1rem + 0.8vw, 1.5rem)', lineHeight: 1.2, weight: 500 },
  bodyLg: { size: 'clamp(1.05rem, 1rem + 0.3vw, 1.25rem)', lineHeight: 1.6, weight: 400 },
  body: { size: '1rem', lineHeight: 1.6, weight: 400 },
  caption: { size: '0.85rem', lineHeight: 1.4, weight: 400 },
} as const;

// --- Motion: GPU-friendly, always meaningful. Timing + easing tokens (full library in /motion) ----
export const duration = {
  micro: 160,
  standard: 300,
  signature: 750,
} as const;

export const easing = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  emphasized: 'cubic-bezier(0.2, 0, 0, 1.1)',
  decelerate: 'cubic-bezier(0, 0, 0, 1)',
  accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
} as const;

// --- Z-index ------------------------------------------------------------------------------------
export const zIndex = {
  base: 0,
  canvas: 10,
  vidyaPresence: 800,
  panel: 900,
  modal: 1000,
  toast: 1100,
} as const;

/** The complete token tree, for non-CSS consumers (React Native, tests). */
export const tokens = {
  ink,
  paper,
  canvas,
  surface,
  hairline,
  accent,
  vidyaMolten,
  subjectAccents,
  radius,
  frost,
  space,
  fontFamily,
  typeScale,
  duration,
  easing,
  zIndex,
} as const;

export type Tokens = typeof tokens;
