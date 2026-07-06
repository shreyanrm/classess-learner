'use client';

/**
 * The cast & the world — Classess' illustration system, alive.
 *
 * One soft, friendly, flat language: eight study buddies and a shelf of props built on a single
 * skeleton (see shared.tsx for the ten rules). Everything shares one baseline, one palette, and
 * one slow idle — so any mix drops into a single <Scene> and reads as one world.
 *
 * Vidya (packages/vidya) is untouched by this system: the cast are her world, not her rivals.
 */

import type { CSSProperties, ComponentType } from 'react';
import { Ember, Juni, Pico, Pip, Sage, Sprout, Torto, Volt } from './characters';
import { Beaker, Books, Bulb, Flag, Pencil, Planet, Plant, Trophy } from './props';
import { type CastFigureProps, hexWash, type Mood, type WorldPropProps } from './shared';

export { Ember, Juni, Pico, Pip, Sage, Sprout, Torto, Volt } from './characters';
export { Beaker, Books, Bulb, Flag, Pencil, Planet, Plant, Trophy } from './props';
export {
  type CastFigureProps,
  Eyes,
  FACE_INK,
  GROUND_FILL,
  hexWash,
  type Mood,
  Mouth,
  PAINT,
  Spark,
  type WorldPropProps,
} from './shared';

// --- the registry --------------------------------------------------------------------------------
export type CastId = 'pip' | 'sage' | 'sprout' | 'volt' | 'ember' | 'pico' | 'juni' | 'torto';
export type PropId = 'books' | 'beaker' | 'planet' | 'plant' | 'flag' | 'pencil' | 'bulb' | 'trophy';

export const CAST: Record<CastId, { name: string; role: string; Component: ComponentType<CastFigureProps> }> = {
  pip: { name: 'Pip', role: 'the curious cat', Component: Pip },
  sage: { name: 'Sage', role: 'the wise owl', Component: Sage },
  sprout: { name: 'Sprout', role: 'the new idea', Component: Sprout },
  volt: { name: 'Volt', role: 'the robot', Component: Volt },
  ember: { name: 'Ember', role: 'the clever fox', Component: Ember },
  pico: { name: 'Pico', role: 'the little penguin', Component: Pico },
  juni: { name: 'Juni', role: 'the bee', Component: Juni },
  torto: { name: 'Torto', role: 'the steady turtle', Component: Torto },
};

export const PROPS: Record<PropId, { name: string; Component: ComponentType<WorldPropProps> }> = {
  books: { name: 'books', Component: Books },
  beaker: { name: 'flask', Component: Beaker },
  planet: { name: 'planet', Component: Planet },
  plant: { name: 'plant', Component: Plant },
  flag: { name: 'flag', Component: Flag },
  pencil: { name: 'pencil', Component: Pencil },
  bulb: { name: 'lightbulb', Component: Bulb },
  trophy: { name: 'trophy', Component: Trophy },
};

// --- it all composes ------------------------------------------------------------------------------
export interface SceneItem {
  id: CastId | PropId;
  /** Horizontal position, 0..1 across the scene. */
  x: number;
  /** Figure width in px. */
  size: number;
  mood?: Mood;
  flip?: boolean;
  /** Lift above the shared baseline, px — for hovering figures. */
  lift?: number;
}

/**
 * Scene — the composer. Cast and props share one baseline on a soft hue-washed ground,
 * each figure keeping its own idle so the whole picture breathes out of sync (alive, never
 * mechanical). Items render left-to-right; later items sit in front.
 */
export function Scene({
  items,
  height = 170,
  hue = '#1F35E0',
  wash = 0.05,
  animate = true,
  baseline = 12,
  style,
}: {
  items: SceneItem[];
  height?: number;
  /** The ground's tint — a subject hue or an accent. */
  hue?: string;
  /** How strong the wash reads; keep it soft. */
  wash?: number;
  animate?: boolean;
  /** Padding under the shared ground line, px. */
  baseline?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: 'relative',
        height,
        overflow: 'hidden',
        borderRadius: 3,
        background: `linear-gradient(180deg, ${hexWash(hue, wash * 0.35)} 0%, ${hexWash(hue, wash)} 100%)`,
        ...style,
      }}
    >
      {items.map((item, i) => {
        const member = CAST[item.id as CastId];
        const world = PROPS[item.id as PropId];
        return (
          <div
            key={`${item.id}-${item.x}`}
            style={{
              position: 'absolute',
              left: `${item.x * 100}%`,
              bottom: baseline + (item.lift ?? 0),
              transform: 'translateX(-50%)',
            }}
          >
            {member ? (
              <member.Component
                size={item.size}
                mood={item.mood}
                flip={item.flip}
                animate={animate}
                seed={i}
              />
            ) : (
              world && <world.Component size={item.size} animate={animate} seed={i} />
            )}
          </div>
        );
      })}
    </div>
  );
}
