'use client';

/**
 * Biomes — the atmospheres a subject's map flows through (adventure roadmap). A CHAPTER is a
 * region: a stretch of terrain with its own palette, props, and sky wash; the map scrolls from one
 * region into the next, the atmosphere blending at the border. Topics are the checkpoints seated on
 * the road that winds through; content steps are the cobbles between them (drawn by the roadmap).
 *
 * Each biome carries a light palette and paints its own scene (pines, spires, dunes…) into a band.
 * The roadmap derives the dark-theme palette from the light one, draws the shared terrain engine
 * (plateaus with lit tops and darker cliff sides), then calls the biome to scatter its props. Pure,
 * deterministic SVG — no assets, no outlines shouting — premium flat-with-depth, never cartoon.
 */

import type { ReactNode } from 'react';
import { blobPath, hash, mixHex, rng } from './art';

/** The resolved colour set a biome paints with — light values live on the biome; dark is derived. */
export interface BiomePalette {
  /** Atmosphere wash behind the region (top → foot). */
  washTop: string;
  washBot: string;
  /** Plateau faces — the lit grassy top and the darker cliff side under it. */
  top: string;
  side: string;
  /** The road surface laid on this land, and its casing edge. */
  road: string;
  roadEdge: string;
  /** A distant parallax hill sitting on the horizon of the region. */
  far: string;
  /** The vibrant pop — current-checkpoint glow, one accent per region. */
  accent: string;
}

/** Where a biome may place its props — the region band and the road that threads it. */
export interface BandGeom {
  W: number;
  yTop: number;
  yBot: number;
  /** The road's centre x at a given y — so a prop can sit beside it, or straddle it. */
  cxAt: (y: number) => number;
  rand: () => number;
}

export interface Biome extends BiomePalette {
  id: string;
  name: string;
  /**
   * Paint the region. `back` renders behind the road (terrain furniture the road passes in front
   * of); `front` renders over it (a feature the road tucks BEHIND — the overlap that sells depth).
   */
  scene: (g: BandGeom, pal: BiomePalette) => { back: ReactNode; front: ReactNode };
}

// --- prop helpers — a small kit, reused across biomes, tinted by the region palette --------------

const shadow = (x: number, y: number, rx: number) => (
  <ellipse cx={x} cy={y} rx={rx} ry={rx * 0.34} fill="rgba(20,22,28,0.13)" />
);

/** A two-tier conifer with a trunk — the forest and the snowfields. */
function conifer(key: string, x: number, by: number, h: number, pal: BiomePalette, cap?: string) {
  const w = h * 0.44;
  const dark = mixHex(pal.top, '#0c3a22', 0.5);
  const body = mixHex(pal.top, dark, 0.5);
  return (
    <g key={key}>
      {shadow(x, by + 1, w * 0.8)}
      <rect
        x={x - 1.4}
        y={by - h * 0.16}
        width={2.8}
        height={h * 0.18}
        fill={mixHex(pal.side, '#3a2414', 0.4)}
      />
      <path
        d={`M${x} ${by - h} L${x - w} ${by - h * 0.4} L${x + w} ${by - h * 0.4} Z`}
        fill={dark}
      />
      <path
        d={`M${x} ${by - h * 0.66} L${x - w * 1.05} ${by - h * 0.12} L${x + w * 1.05} ${by - h * 0.12} Z`}
        fill={body}
      />
      {cap && (
        <path
          d={`M${x} ${by - h} L${x - w * 0.34} ${by - h * 0.76} L${x + w * 0.34} ${by - h * 0.76} Z`}
          fill={cap}
        />
      )}
    </g>
  );
}

/** A soft round-canopy tree — meadow, ocean palm-stand stand-in. */
function roundTree(key: string, x: number, by: number, r: number, pal: BiomePalette, seed: number) {
  const dark = mixHex(pal.top, '#123a12', 0.5);
  return (
    <g key={key}>
      {shadow(x, by + 1, r * 0.95)}
      <rect
        x={x - 2}
        y={by - r * 1.1}
        width={4}
        height={r * 1.15}
        fill={mixHex(pal.side, '#4a3016', 0.45)}
        rx={1.5}
      />
      <path d={blobPath(x, by - r * 1.5, r, r * 0.92, seed, 9, 0.16)} fill={dark} />
      <path
        d={blobPath(x - r * 0.22, by - r * 1.66, r * 0.62, r * 0.58, seed + 7, 8, 0.16)}
        fill={mixHex(pal.top, '#ffffff', 0.14)}
      />
    </g>
  );
}

/** A rounded boulder — the shared rock, tinted per land. */
function boulder(key: string, x: number, by: number, r: number, pal: BiomePalette, seed: number) {
  const base = mixHex(pal.side, '#000000', 0.08);
  return (
    <g key={key}>
      {shadow(x, by + 1, r * 1.05)}
      <path d={blobPath(x, by - r * 0.62, r, r * 0.72, seed, 8, 0.14)} fill={base} />
      <path
        d={blobPath(x - r * 0.2, by - r * 0.82, r * 0.6, r * 0.42, seed + 3, 7, 0.15)}
        fill={mixHex(base, '#ffffff', 0.16)}
      />
    </g>
  );
}

/** A tall rock spire — ember ridge, night crystals share the silhouette. */
function spire(key: string, x: number, by: number, h: number, pal: BiomePalette, glow?: string) {
  const w = h * 0.3;
  const dark = mixHex(pal.side, '#000000', 0.12);
  return (
    <g key={key}>
      {shadow(x, by + 1, w * 1.2)}
      <path d={`M${x} ${by - h} L${x - w} ${by} L${x + w} ${by} Z`} fill={dark} />
      <path
        d={`M${x} ${by - h} L${x} ${by} L${x + w} ${by} Z`}
        fill={mixHex(dark, '#ffffff', 0.14)}
      />
      {glow && <circle cx={x} cy={by - h * 0.5} r={w * 0.5} fill={glow} opacity={0.85} />}
    </g>
  );
}

/** A saguaro cactus — the dunes. */
function cactus(key: string, x: number, by: number, h: number, pal: BiomePalette) {
  const c = mixHex(pal.accent, '#2e7d32', 0.45);
  const w = 4.6;
  return (
    <g key={key}>
      {shadow(x, by + 1, h * 0.28)}
      <path
        d={`M${x} ${by} v${-h} M${x} ${by - h * 0.5} h${-h * 0.28} v${-h * 0.24} M${x} ${by - h * 0.66} h${h * 0.24} v${-h * 0.2}`}
        fill="none"
        stroke={c}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** A layered mesa — the red canyon's signature stepped rock. */
function mesa(key: string, x: number, by: number, h: number, pal: BiomePalette) {
  const w = h * 0.9;
  const a = mixHex(pal.side, '#000000', 0.05);
  const b = mixHex(pal.side, '#ffffff', 0.12);
  return (
    <g key={key}>
      {shadow(x, by + 1, w * 0.8)}
      <path
        d={`M${x - w} ${by} L${x - w * 0.86} ${by - h * 0.62} L${x + w * 0.86} ${by - h * 0.62} L${x + w} ${by} Z`}
        fill={a}
      />
      <path
        d={`M${x - w * 0.7} ${by - h * 0.62} L${x - w * 0.58} ${by - h} L${x + w * 0.5} ${by - h} L${x + w * 0.62} ${by - h * 0.62} Z`}
        fill={b}
      />
    </g>
  );
}

/** A little watchtower — the forest's one landmark. Straddles the road as a front feature. */
function watchtower(key: string, x: number, by: number, pal: BiomePalette) {
  const wood = mixHex(pal.side, '#5a3a1e', 0.5);
  const roof = mixHex(pal.accent, '#000000', 0.15);
  return (
    <g key={key}>
      {shadow(x, by + 1, 15)}
      <path
        d={`M${x - 9} ${by} L${x - 6} ${by - 30} L${x + 6} ${by - 30} L${x + 9} ${by} Z`}
        fill={wood}
      />
      <rect
        x={x - 8}
        y={by - 40}
        width={16}
        height={12}
        rx={2}
        fill={mixHex(wood, '#ffffff', 0.12)}
      />
      <path d={`M${x - 11} ${by - 40} L${x} ${by - 52} L${x + 11} ${by - 40} Z`} fill={roof} />
      <rect
        x={x - 2.4}
        y={by - 24}
        width={4.8}
        height={7}
        rx={1}
        fill={mixHex(wood, '#000000', 0.2)}
      />
    </g>
  );
}

/** Scatter a biome's back props on either side of the road, plus one front feature over it. */
function scatter(
  g: BandGeom,
  opts: {
    back: (key: string, x: number, y: number, s: number, seed: number) => ReactNode;
    front: (key: string, x: number, y: number) => ReactNode;
    count?: number;
    accents?: ReactNode;
  },
): { back: ReactNode; front: ReactNode } {
  const { rand, W, yTop, yBot } = g;
  const n = opts.count ?? 2 + Math.floor(rand() * 2); // 2..3 back props
  const items: { node: ReactNode; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const y = yTop + 30 + rand() * (yBot - yTop - 60);
    const side = rand() < 0.5 ? -1 : 1;
    const cx = g.cxAt(y);
    let x = cx + side * (54 + rand() * (W * 0.13));
    x = Math.max(30, Math.min(W - 30, x));
    const s = 0.82 + rand() * 0.4;
    items.push({
      node: opts.back(`bk-${i}-${x.toFixed(0)}-${y.toFixed(0)}`, x, y, s, hash(`${i}:${y}`)),
      y,
    });
  }
  items.sort((a, b) => a.y - b.y); // painter's order — lower props in front
  const fy = yTop + (yBot - yTop) * (0.4 + rand() * 0.2);
  const front = opts.front(`ft-${fy.toFixed(0)}`, g.cxAt(fy) + (rand() < 0.5 ? -22 : 22), fy);
  return {
    back: (
      <>
        {opts.accents}
        {items.map((it) => it.node)}
      </>
    ),
    front,
  };
}

// --- the ordered march of atmospheres — a subject's chapters travel through these ----------------

export const BIOMES: Biome[] = [
  {
    id: 'forest',
    name: 'the deep forest',
    washTop: '#E8F5EC',
    washBot: '#D2ECDB',
    top: '#7FC98F',
    side: '#3C8A5B',
    road: '#E7D6B2',
    roadEdge: '#C6A671',
    far: '#B7DFC5',
    accent: '#1CA363',
    scene: (g, pal) =>
      scatter(g, {
        back: (k, x, y, s) => conifer(k, x, y, 42 * s, pal),
        front: (k, x, y) => watchtower(k, x, y, pal),
        count: 3,
      }),
  },
  {
    id: 'snow',
    name: 'the snowfields',
    washTop: '#F4F8FD',
    washBot: '#E2EDF8',
    top: '#D6E4F5',
    side: '#A4BCDC',
    road: '#DBE6F3',
    roadEdge: '#AABFDA',
    far: '#C7D9EF',
    accent: '#4C7FD6',
    scene: (g, pal) =>
      scatter(g, {
        back: (k, x, y, s) => conifer(k, x, y, 40 * s, pal, '#FFFFFF'),
        front: (k, x, y) =>
          boulder(k, x, y, 20, { ...pal, side: '#CFDDEE' }, hash(`snowrock:${y}`)),
        count: 3,
      }),
  },
  {
    id: 'lava',
    name: 'the ember ridge',
    washTop: '#F6E6DB',
    washBot: '#E9CDBB',
    top: '#8C5340',
    side: '#593224',
    road: '#3E2C24',
    roadEdge: '#241811',
    far: '#C99A82',
    accent: '#FF5A1F',
    scene: (g, pal) =>
      scatter(g, {
        back: (k, x, y, s, seed) =>
          spire(k, x, y, 44 * s, pal, seed % 3 === 0 ? '#FF7A3C' : undefined),
        front: (k, x, y) => boulder(k, x, y, 22, pal, hash(`emberrock:${y}`)),
        count: 3,
        accents: null,
      }),
  },
  {
    id: 'ocean',
    name: 'the coral shore',
    washTop: '#E2F3F5',
    washBot: '#C7E7EC',
    top: '#EAD9A8',
    side: '#C6A768',
    road: '#E9D3A2',
    roadEdge: '#C7A970',
    far: '#BEE4E9',
    accent: '#0FA3B1',
    scene: (g, pal) =>
      scatter(g, {
        back: (k, x, y, s, seed) => roundTree(k, x, y, 15 * s, { ...pal, top: '#3EBF9A' }, seed),
        front: (k, x, y) =>
          boulder(k, x, y, 19, { ...pal, side: '#9BC7CC' }, hash(`shorerock:${y}`)),
        count: 3,
      }),
  },
  {
    id: 'night',
    name: 'the night reaches',
    washTop: '#E7E9FB',
    washBot: '#D2D6F2',
    top: '#8A8FCB',
    side: '#4E52A0',
    road: '#D6D2EC',
    roadEdge: '#ABA6D8',
    far: '#C5C8EC',
    accent: '#4257F0',
    scene: (g, pal) =>
      scatter(g, {
        back: (k, x, y, s) => spire(k, x, y, 40 * s, { ...pal, side: '#5A5FB0' }, '#8E93F5'),
        front: (k, x, y) => spire(k, x, y, 30, { ...pal, side: '#6A6FC0' }, '#A9AEFF'),
        count: 3,
      }),
  },
  {
    id: 'desert',
    name: 'the dunes',
    washTop: '#FBF1DD',
    washBot: '#F4E2C0',
    top: '#EAC98D',
    side: '#C79A5A',
    road: '#E7CFA0',
    roadEdge: '#C4A46E',
    far: '#EBD3A6',
    accent: '#E8881A',
    scene: (g, pal) =>
      scatter(g, {
        back: (k, x, y, s) => cactus(k, x, y, 34 * s, pal),
        front: (k, x, y) => boulder(k, x, y, 20, pal, hash(`dunerock:${y}`)),
        count: 3,
      }),
  },
  {
    id: 'meadow',
    name: 'the sunlit meadow',
    washTop: '#F1F8E6',
    washBot: '#E2F0CD',
    top: '#B7DE86',
    side: '#6EAC4C',
    road: '#E9DBB4',
    roadEdge: '#CBB37E',
    far: '#CDE7A6',
    accent: '#66B300',
    scene: (g, pal) =>
      scatter(g, {
        back: (k, x, y, s, seed) => roundTree(k, x, y, 16 * s, pal, seed),
        front: (k, x, y) => roundTree(k, x, y, 18, pal, hash(`meadowtree:${y}`)),
        count: 3,
      }),
  },
  {
    id: 'canyon',
    name: 'the red canyon',
    washTop: '#FAEBE2',
    washBot: '#F0D4C4',
    top: '#D98A5E',
    side: '#9E4E30',
    road: '#E7C09E',
    roadEdge: '#C08A5E',
    far: '#E3B598',
    accent: '#CC5A2E',
    scene: (g, pal) =>
      scatter(g, {
        back: (k, x, y, s) => mesa(k, x, y, 40 * s, pal),
        front: (k, x, y) => boulder(k, x, y, 21, pal, hash(`canyonrock:${y}`)),
        count: 3,
      }),
  },
];

const GRAPHITE = '#15161B';
const NEARBLACK = '#0D0E12';

/** Derive the on-theme palette — light values ship on the biome; dark drops luminance, keeps hue. */
export function resolveBiome(b: Biome, dark: boolean): BiomePalette {
  if (!dark) return b;
  return {
    washTop: mixHex(b.accent, GRAPHITE, 0.82),
    washBot: mixHex(b.accent, NEARBLACK, 0.9),
    top: mixHex(b.top, GRAPHITE, 0.5),
    side: mixHex(b.side, NEARBLACK, 0.52),
    road: mixHex(b.road, GRAPHITE, 0.52),
    roadEdge: mixHex(b.roadEdge, NEARBLACK, 0.42),
    far: mixHex(b.far, GRAPHITE, 0.7),
    accent: mixHex(b.accent, '#FFFFFF', 0.12),
  };
}

/** The chapter's biome — stable, derived from its id (its place never changes between visits). */
export function biomeFor(chapterId: string): Biome {
  return BIOMES[hash(`biome:${chapterId}`) % BIOMES.length] as Biome;
}

/** A stable per-chapter rng seeded off its id — for the biome's small living variations. */
export function biomeRng(chapterId: string): () => number {
  return rng(hash(`biome-scene:${chapterId}`));
}
