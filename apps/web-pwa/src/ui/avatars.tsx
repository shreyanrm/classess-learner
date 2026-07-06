'use client';

/**
 * Avatars — the cast as the learner's face. Each study buddy becomes a head/bust tile on its
 * own soft hue wash; the learner picks one, uploads a photo, or stays with their initial.
 * The choice persists as clss-avatar-v1 and everything renders through renderAvatar().
 */

import type { CSSProperties, ReactNode } from 'react';
import { CAST, type CastId, hexWash } from './cast';

export type AvatarChoice = { kind: 'photo' | 'cast' | 'initial'; castId?: CastId };

export const AVATAR_KEY = 'clss-avatar-v1';
/** Fired on every saveAvatarChoice so always-mounted chrome (the header) re-reads instantly. */
export const AVATAR_CHANGED_EVENT = 'clss-avatar-changed';
// ponytail: mirrors PHOTO_KEY in screens/you/profile.ts — ui/ must not import from screens/
const PHOTO_KEY = 'clss-profile-photo-v1';
const PROFILE_KEY = 'clss-learner-profile';

/**
 * The roster — every cast member with its wash hue and head/bust framing:
 * (fx, fy) is the focal point in figure coordinates (120x130), zoom is tile-widths of figure.
 */
export const AVATARS: Record<CastId, { hue: string; fx: number; fy: number; zoom: number }> = {
  pip: { hue: '#5B6473', fx: 60, fy: 54, zoom: 1.45 },
  sage: { hue: '#A9794A', fx: 60, fy: 60, zoom: 1.45 },
  sprout: { hue: '#1CA363', fx: 60, fy: 74, zoom: 1.25 },
  volt: { hue: '#39A0DE', fx: 60, fy: 48, zoom: 1.45 },
  ember: { hue: '#E8881A', fx: 60, fy: 52, zoom: 1.45 },
  pico: { hue: '#33343A', fx: 60, fy: 58, zoom: 1.4 },
  juni: { hue: '#DFA21F', fx: 58, fy: 68, zoom: 1.55 },
  torto: { hue: '#13B5A0', fx: 76, fy: 90, zoom: 1.5 },
};

export const AVATAR_IDS = Object.keys(AVATARS) as CastId[];

export function loadAvatarChoice(): AvatarChoice | null {
  try {
    const raw = localStorage.getItem(AVATAR_KEY);
    return raw ? (JSON.parse(raw) as AvatarChoice) : null;
  } catch {
    return null;
  }
}

export function saveAvatarChoice(choice: AvatarChoice): void {
  try {
    localStorage.setItem(AVATAR_KEY, JSON.stringify(choice));
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
    name = (JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}') as { name?: string }).name ?? 'A';
    photo = localStorage.getItem(PHOTO_KEY);
  } catch {
    // unreadable — the initial letter carries the day
  }
  return { name, photo, choice: loadAvatarChoice() };
}

/** One cast member as an avatar tile — head/bust crop on a soft hue-washed square, 3px radius. */
export function CastAvatar({
  id,
  size = 34,
  style,
}: {
  id: CastId;
  size?: number;
  style?: CSSProperties;
}) {
  const frame = AVATARS[id];
  const member = CAST[id];
  const w = size * frame.zoom;
  const h = w * (130 / 120);
  return (
    <span
      title={member.name}
      style={{
        width: size,
        height: size,
        borderRadius: 3,
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
          left: size / 2 - (frame.fx / 120) * w,
          top: size / 2 - (frame.fy / 130) * h,
          width: w,
          height: h,
          display: 'block',
        }}
      >
        <member.Component size={w} animate={false} />
      </span>
    </span>
  );
}

/**
 * The one resolver: uploaded photo > chosen cast member > initial letter.
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
          borderRadius: 3,
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
        borderRadius: 3,
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
