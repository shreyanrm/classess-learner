'use client';

/**
 * Biomes — each chapter of a subject becomes a place with its own weather (adventure roadmap).
 * Pure SVG, drawn in a 0..100 box and clipped to a medallion circle by the caller. Deterministic
 * per chapter: the biome and its small variations (peak height, star count, ember drift) are
 * derived from the chapter id through the shared art hash/rng. Light-theme, layered, premium —
 * never cartoon-cheap: soft washes, one clean motif, no outlines shouting.
 */

import type { ReactNode } from 'react';
import { hash, rng } from './art';

export interface Biome {
  id: string;
  name: string;
  /** The two-stop sky wash behind the scene (top → foot). */
  sky: [string, string];
  /** The biome's own accent — used for the "you are here" life and stop hue when neutral. */
  accent: string;
  /** Draw the scene in a 0..100 viewBox; `rand` gives stable per-chapter variation. */
  draw: (rand: () => number) => ReactNode;
}

const g = '#1CA363';

/** The ordered march of places — a subject's chapters travel through these. */
export const BIOMES: Biome[] = [
  {
    id: 'forest',
    name: 'the deep forest',
    sky: ['#EAF6EE', '#D6EFDE'],
    accent: '#1CA363',
    draw: (rand) => {
      const pines = 3 + Math.floor(rand() * 2);
      return (
        <>
          <path d="M0 78 Q50 68 100 80 V100 H0 Z" fill="#BFE6CC" />
          {Array.from({ length: pines }, (_, i) => {
            const x = 18 + i * (64 / Math.max(1, pines - 1));
            const h = 30 + rand() * 16;
            const shade = i % 2 ? '#25925A' : g;
            return (
              <g key={`pine-${x.toFixed(1)}`}>
                <path d={`M${x} ${82 - h} L${x - 11} 84 L${x + 11} 84 Z`} fill={shade} />
                <path
                  d={`M${x} ${82 - h + 8} L${x - 8} ${78} L${x + 8} ${78} Z`}
                  fill={shade}
                  opacity={0.85}
                />
              </g>
            );
          })}
        </>
      );
    },
  },
  {
    id: 'snow',
    name: 'the snowfields',
    sky: ['#EAF1FA', '#DCE8F6'],
    accent: '#4C7FD6',
    draw: (rand) => (
      <>
        <path d="M8 82 L42 34 L74 82 Z" fill="#C6D6EC" />
        <path d="M42 34 L54 52 L30 52 Z" fill="#FFFFFF" />
        <path d="M0 84 Q30 74 60 84 T100 84 V100 H0 Z" fill="#EDF3FB" />
        {Array.from({ length: 5 }, () => {
          const cx = 12 + rand() * 78;
          const cy = 12 + rand() * 40;
          return (
            <circle
              key={`flake-${cx.toFixed(1)}-${cy.toFixed(1)}`}
              cx={cx}
              cy={cy}
              r={1.4}
              fill="#8FB0DD"
              opacity={0.8}
            />
          );
        })}
      </>
    ),
  },
  {
    id: 'lava',
    name: 'the ember ridge',
    sky: ['#FCEDE4', '#F7DBCB'],
    accent: '#FF5A1F',
    draw: (rand) => (
      <>
        <path d="M10 84 L46 38 L82 84 Z" fill="#7C3A24" />
        <path d="M46 38 L58 60 L34 60 Z" fill="#FF5A1F" />
        <circle cx={46} cy={44} r={5} fill="#FFC93C" />
        {Array.from({ length: 4 }, () => {
          const cx = 38 + rand() * 20;
          const cy = 26 + rand() * 12;
          return (
            <circle
              key={`ember-${cx.toFixed(1)}-${cy.toFixed(1)}`}
              cx={cx}
              cy={cy}
              r={1.6}
              fill="#FF7A3C"
              opacity={0.85}
            />
          );
        })}
        <path d="M0 86 Q50 80 100 86 V100 H0 Z" fill="#E9C4B0" />
      </>
    ),
  },
  {
    id: 'ocean',
    name: 'the open ocean',
    sky: ['#E4F4F6', '#CFEAEE'],
    accent: '#0FA3B1',
    draw: (rand) => (
      <>
        <circle cx={70} cy={34} r={9} fill="#FFC93C" opacity={0.9} />
        {Array.from({ length: 3 }, (_, i) => {
          const y = 60 + i * 12;
          return (
            <path
              key={`wave-${y}`}
              d={`M-4 ${y} q14 -6 28 0 t28 0 t28 0 t28 0`}
              fill="none"
              stroke={i % 2 ? '#0FA3B1' : '#2BC4D3'}
              strokeWidth={2.4}
              strokeLinecap="round"
              opacity={0.9 - i * 0.15}
            />
          );
        })}
        <rect
          x={0}
          y={82}
          width={100}
          height={18}
          fill="#BEE6EA"
          opacity={rand() > 0.5 ? 1 : 0.9}
        />
      </>
    ),
  },
  {
    id: 'night',
    name: 'the night sky',
    sky: ['#E7E9FB', '#D7DBF6'],
    accent: '#4257F0',
    draw: (rand) => (
      <>
        <path d="M64 22 a13 13 0 1 0 13 15 a10 10 0 1 1 -13 -15 Z" fill="#C6CBF2" />
        {Array.from({ length: 7 }, () => {
          const cx = 10 + rand() * 80;
          const cy = 14 + rand() * 54;
          return (
            <circle
              key={`nstar-${cx.toFixed(1)}-${cy.toFixed(1)}`}
              cx={cx}
              cy={cy}
              r={rand() > 0.7 ? 1.8 : 1.1}
              fill="#4257F0"
              opacity={0.55 + rand() * 0.35}
            />
          );
        })}
        <path d="M0 84 Q50 78 100 84 V100 H0 Z" fill="#CBCFEF" />
      </>
    ),
  },
  {
    id: 'desert',
    name: 'the dunes',
    sky: ['#FCF3E2', '#F8E7C6'],
    accent: '#E8881A',
    draw: (rand) => (
      <>
        <circle cx={30} cy={30} r={10} fill="#F0A030" opacity={0.9} />
        <path d="M0 70 Q28 56 56 70 T112 70 V100 H0 Z" fill="#EAC489" />
        <path d="M0 84 Q34 74 68 84 T120 84 V100 H0 Z" fill="#DDAE68" />
        {rand() > 0.4 && (
          <path
            d="M78 84 v-14 M74 76 h8 M74 72 h8"
            stroke="#9C7238"
            strokeWidth={2}
            strokeLinecap="round"
          />
        )}
      </>
    ),
  },
  {
    id: 'meadow',
    name: 'the sunlit meadow',
    sky: ['#F1F8E6', '#E4F1CE'],
    accent: '#66B300',
    draw: (rand) => (
      <>
        <path d="M0 74 Q50 62 100 74 V100 H0 Z" fill="#CFE79A" />
        <path d="M0 84 Q50 76 100 84 V100 H0 Z" fill="#B7DA78" />
        {Array.from({ length: 4 }, (_, i) => {
          const x = 16 + i * 22 + rand() * 6;
          return (
            <g key={`flower-${x.toFixed(1)}`}>
              <line x1={x} y1={84} x2={x} y2={72} stroke="#66B300" strokeWidth={1.6} />
              <circle cx={x} cy={70} r={3} fill={i % 2 ? '#CC1E7A' : '#FFC93C'} />
            </g>
          );
        })}
      </>
    ),
  },
  {
    id: 'canyon',
    name: 'the red canyon',
    sky: ['#FBEDE6', '#F4D9C9'],
    accent: '#CC5A2E',
    draw: (rand) => (
      <>
        <path d="M0 80 L22 44 L40 80 Z" fill="#C96A44" />
        <path d="M46 80 L70 34 L94 80 Z" fill="#B65535" />
        <path d="M46 80 L70 34 L82 58 L70 80 Z" fill="#A6472C" opacity={0.6} />
        <path d="M0 82 Q50 76 100 82 V100 H0 Z" fill="#E3B79E" />
        {rand() > 0.6 && <circle cx={20} cy={26} r={7} fill="#F0A030" opacity={0.85} />}
      </>
    ),
  },
];

/** The chapter's biome — stable, derived from its id (its place never changes between visits). */
export function biomeFor(chapterId: string): Biome {
  return BIOMES[hash(`biome:${chapterId}`) % BIOMES.length] as Biome;
}

/** A stable per-chapter rng seeded off its id — for the biome's small living variations. */
export function biomeRng(chapterId: string): () => number {
  return rng(hash(`biome-scene:${chapterId}`));
}
