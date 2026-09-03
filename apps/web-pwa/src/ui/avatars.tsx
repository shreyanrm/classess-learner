'use client';

/**
 * Avatars — the cast, the ported buddies, and the menagerie as the learner's face. Each figure
 * becomes a head/bust tile on its own soft hue wash; the learner picks one, uploads a photo, or
 * stays with their initial. The choice persists as wobo-avatar-v1 and everything renders through
 * renderAvatar().
 */

import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { scoped } from '../store/scope';
import { ANIMALS, BUDDIES, CAST, hexWash } from './cast';

/** Any figure the learner can wear — derived from the AVATARS roster below. */
export type AvatarId = keyof typeof AVATARS;

export type AvatarChoice = { kind: 'photo' | 'cast' | 'initial'; castId?: AvatarId };

export const AVATAR_KEY = 'wobo-avatar-v1';
/** Fired on every saveAvatarChoice so always-mounted chrome (the header) re-reads instantly. */
export const AVATAR_CHANGED_EVENT = 'wobo-avatar-changed';
// ponytail: mirrors PHOTO_KEY in screens/you/profile.ts — ui/ must not import from screens/
const PHOTO_KEY = 'wobo-profile-photo-v1';
const PROFILE_KEY = 'wobo-learner-profile';

// --- one resolver for every figure, whatever registry it lives in --------------------------------
/** Only size + animate are ever passed to a tile; mood/flip stay at each figure's default. */
type TileComponent = ComponentType<{ size?: number; animate?: boolean }>;

const FIGURES = {
  ...mapComponents(CAST),
  ...mapComponents(BUDDIES),
  ...mapComponents(ANIMALS),
} as Record<AvatarId, TileComponent>;
const FIGURE_NAMES = {
  ...mapNames(CAST),
  ...mapNames(BUDDIES),
  ...mapNames(ANIMALS),
} as Record<AvatarId, string>;

function mapComponents(
  reg: Record<string, { Component: TileComponent }>,
): Record<string, TileComponent> {
  return Object.fromEntries(Object.entries(reg).map(([id, v]) => [id, v.Component]));
}
function mapNames(reg: Record<string, { name: string }>): Record<string, string> {
  return Object.fromEntries(Object.entries(reg).map(([id, v]) => [id, v.name]));
}

/** The display name for a figure, for titles and aria labels. */
export function avatarName(id: AvatarId): string {
  return FIGURE_NAMES[id] ?? id;
}

// --- the roster ----------------------------------------------------------------------------------
type AvatarGroup = 'buddy' | 'animal';
type AvatarFrame = {
  hue: string;
  fx: number;
  fy: number;
  zoom: number;
  vw?: number;
  vh?: number;
  group: AvatarGroup;
};
/**
 * Every wearable figure with its wash hue and head/bust framing.
 * (fx, fy) is the focal point in that figure's own viewBox coordinates (vw x vh, default 120x130);
 * zoom is tile-widths of figure. group splits the picker into buddies and animals.
 */
export const AVATARS = {
  // the original cast (120x130 canvas)
  pip: { hue: '#5B6473', fx: 60, fy: 54, zoom: 1.45, group: 'buddy' },
  sage: { hue: '#A9794A', fx: 60, fy: 60, zoom: 1.45, group: 'buddy' },
  sprout: { hue: '#1CA363', fx: 60, fy: 74, zoom: 1.25, group: 'buddy' },
  volt: { hue: '#39A0DE', fx: 60, fy: 48, zoom: 1.45, group: 'buddy' },
  ember: { hue: '#E8881A', fx: 60, fy: 52, zoom: 1.45, group: 'buddy' },
  pico: { hue: '#33343A', fx: 60, fy: 58, zoom: 1.4, group: 'buddy' },
  juni: { hue: '#DFA21F', fx: 58, fy: 68, zoom: 1.55, group: 'buddy' },
  torto: { hue: '#13B5A0', fx: 76, fy: 90, zoom: 1.5, group: 'buddy' },
  // the ported buddies (120x178 full figures — crop to the head)
  ace: { hue: '#2563EB', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  iris: { hue: '#D6196F', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  theo: { hue: '#13B5A0', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  maya: { hue: '#8E6FC4', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  sol: { hue: '#DFA21F', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  wren: { hue: '#39A0DE', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  juno: { hue: '#E2674A', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  pax: { hue: '#1CA363', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  remy: { hue: '#E8881A', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  nova: { hue: '#6D4AE0', fx: 60, fy: 68, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  indi: { hue: '#C026A6', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  bo: { hue: '#82B23A', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  vera: { hue: '#E0518A', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  otis: { hue: '#5B6473', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  lumi: { hue: '#F26A38', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  dev: { hue: '#1F4FD8', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  robin: { hue: '#0FA3A3', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  suri: { hue: '#DFA21F', fx: 60, fy: 72, zoom: 2.0, vw: 120, vh: 178, group: 'buddy' },
  // the menagerie (each with its native catalog viewBox)
  dog: { hue: '#D9A368', fx: 44, fy: 54, zoom: 1.9, vw: 150, vh: 120, group: 'animal' },
  cat: { hue: '#9AA0AA', fx: 46, fy: 56, zoom: 1.9, vw: 150, vh: 120, group: 'animal' },
  rabbit: { hue: '#E0518A', fx: 64, fy: 68, zoom: 1.7, vw: 130, vh: 130, group: 'animal' },
  sheep: { hue: '#C9CDD4', fx: 42, fy: 76, zoom: 1.75, vw: 150, vh: 120, group: 'animal' },
  goat: { hue: '#CFC8BB', fx: 46, fy: 62, zoom: 1.75, vw: 150, vh: 120, group: 'animal' },
  cow: { hue: '#A7AEB8', fx: 44, fy: 60, zoom: 1.7, vw: 160, vh: 120, group: 'animal' },
  horse: { hue: '#B5773F', fx: 42, fy: 54, zoom: 1.7, vw: 160, vh: 130, group: 'animal' },
  pig: { hue: '#E095A6', fx: 46, fy: 58, zoom: 1.85, vw: 150, vh: 120, group: 'animal' },
  bird: { hue: '#39A0DE', fx: 60, fy: 66, zoom: 1.6, vw: 120, vh: 120, group: 'animal' },
  duck: { hue: '#F2C53D', fx: 42, fy: 56, zoom: 1.8, vw: 130, vh: 120, group: 'animal' },
  hen: { hue: '#F2862E', fx: 45, fy: 58, zoom: 1.8, vw: 130, vh: 120, group: 'animal' },
  koi: { hue: '#F2862E', fx: 46, fy: 54, zoom: 1.6, vw: 150, vh: 110, group: 'animal' },
  butterfly: { hue: '#8E6FC4', fx: 60, fy: 56, zoom: 1.5, vw: 120, vh: 110, group: 'animal' },
  bee: { hue: '#F2C53D', fx: 52, fy: 58, zoom: 1.6, vw: 120, vh: 110, group: 'animal' },
  turtle: { hue: '#5AAE76', fx: 44, fy: 62, zoom: 1.6, vw: 150, vh: 110, group: 'animal' },
  fox: { hue: '#E8843C', fx: 60, fy: 54, zoom: 1.5, vw: 120, vh: 120, group: 'animal' },
  bear: { hue: '#9C6B45', fx: 60, fy: 54, zoom: 1.5, vw: 120, vh: 120, group: 'animal' },
  panda: { hue: '#2B2B30', fx: 60, fy: 54, zoom: 1.5, vw: 120, vh: 120, group: 'animal' },
  owl: { hue: '#A9794A', fx: 60, fy: 56, zoom: 1.5, vw: 120, vh: 120, group: 'animal' },
  frog: { hue: '#5DBB63', fx: 48, fy: 44, zoom: 1.5, vw: 120, vh: 110, group: 'animal' },
  penguin: { hue: '#33343A', fx: 55, fy: 52, zoom: 1.55, vw: 110, vh: 120, group: 'animal' },
  deer: { hue: '#C58A4E', fx: 60, fy: 58, zoom: 1.5, vw: 120, vh: 130, group: 'animal' },
  elephant: { hue: '#969DA8', fx: 62, fy: 54, zoom: 1.6, vw: 140, vh: 120, group: 'animal' },
  squirrel: { hue: '#C5915A', fx: 52, fy: 54, zoom: 1.7, vw: 130, vh: 120, group: 'animal' },
  hedgehog: { hue: '#7C5436', fx: 40, fy: 60, zoom: 1.7, vw: 130, vh: 100, group: 'animal' },
  snail: { hue: '#E0843C', fx: 56, fy: 58, zoom: 1.5, vw: 140, vh: 100, group: 'animal' },
  ladybug: { hue: '#E23B3B', fx: 56, fy: 60, zoom: 1.6, vw: 120, vh: 110, group: 'animal' },
} satisfies Record<string, AvatarFrame>;

export const AVATAR_IDS = Object.keys(AVATARS) as AvatarId[];
export const BUDDY_IDS = AVATAR_IDS.filter((id) => AVATARS[id].group === 'buddy');
export const ANIMAL_IDS = AVATAR_IDS.filter((id) => AVATARS[id].group === 'animal');

export function loadAvatarChoice(): AvatarChoice | null {
  try {
    const raw = scoped.getItem(AVATAR_KEY);
    return raw ? (JSON.parse(raw) as AvatarChoice) : null;
  } catch {
    return null;
  }
}

/**
 * First boot has no face — allot a random cast buddy so the learner is never a letter.
 * A stored choice (any picker pick, including 'initial') always wins and is left untouched.
 */
export function ensureDefaultAvatar(): void {
  if (loadAvatarChoice()) return;
  const castId = BUDDY_IDS[Math.floor(Math.random() * BUDDY_IDS.length)];
  if (castId) saveAvatarChoice({ kind: 'cast', castId });
}

export function saveAvatarChoice(choice: AvatarChoice): void {
  try {
    scoped.setItem(AVATAR_KEY, JSON.stringify(choice));
  } catch {
    // storage unavailable — the face still applies for this session
  }
  window.dispatchEvent(new Event(AVATAR_CHANGED_EVENT));
}

/** Everything the header needs to draw the learner, straight from storage. */
export function readAvatarProfile(): {
  name: string;
  photo: string | null;
  choice: AvatarChoice | null;
} {
  let name = 'A';
  let photo: string | null = null;
  try {
    name = (JSON.parse(scoped.getItem(PROFILE_KEY) ?? '{}') as { name?: string }).name ?? 'A';
    photo = scoped.getItem(PHOTO_KEY);
  } catch {
    // unreadable — the initial letter carries the day
  }
  return { name, photo, choice: loadAvatarChoice() };
}

/** One figure as an avatar tile — head/bust crop on a soft hue-washed square, 3px radius. */
export function CastAvatar({
  id,
  size = 34,
  style,
}: {
  id: AvatarId;
  size?: number;
  style?: CSSProperties;
}) {
  const frame: AvatarFrame = AVATARS[id];
  const Figure = FIGURES[id];
  const vw = frame.vw ?? 120;
  const vh = frame.vh ?? 130;
  const w = size * frame.zoom;
  const h = w * (vh / vw);
  return (
    <span
      title={avatarName(id)}
      style={{
        width: size,
        height: size,
        borderRadius: '50%', // owner law: avatars are circles (the 3px law is for chrome, not faces)
        background: hexWash(frame.hue, 0.13),
        overflow: 'hidden',
        position: 'relative',
        display: 'block',
        flexShrink: 0,
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: size / 2 - (frame.fx / vw) * w,
          top: size / 2 - (frame.fy / vh) * h,
          width: w,
          height: h,
          display: 'block',
        }}
      >
        <Figure size={w} animate={false} />
      </span>
    </span>
  );
}

/**
 * The one resolver: uploaded photo > chosen figure > initial letter.
 * The stored choice records the learner's latest pick and wins; the ladder covers gaps.
 */
export function renderAvatar(
  profile: { name?: string; photo?: string | null; choice?: AvatarChoice | null },
  size = 34,
): ReactNode {
  const choice = profile.choice === undefined ? loadAvatarChoice() : profile.choice;
  const kind = choice?.kind ?? (profile.photo ? 'photo' : 'initial');
  if (kind === 'cast' && choice?.castId && AVATARS[choice.castId]) {
    return <CastAvatar id={choice.castId} size={size} />;
  }
  if (profile.photo && kind !== 'initial') {
    return (
      <span
        role="img"
        aria-label={profile.name ?? 'your profile photo'}
        style={{
          width: size,
          height: size,
          borderRadius: '50%', // owner law: avatars are circles (the 3px law is for chrome, not faces)
          background: `center/cover url(${profile.photo})`,
          display: 'block',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%', // owner law: avatars are circles (the 3px law is for chrome, not faces)
        background: '#F1F1F5',
        color: '#5C5E66',
        fontWeight: 600,
        fontSize: Math.round(size * 0.42),
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      {(profile.name ?? 'A').trim().charAt(0).toUpperCase() || 'A'}
    </span>
  );
}
