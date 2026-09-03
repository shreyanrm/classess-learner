/**
 * Which ways of signing in are actually wired, read off the ONE auth client the app already has.
 *
 * There is no second client here, and there must never be. The app builds its identity in
 * `@wobo/sdk` (`sdk.account` for the additive account layer, `sdk.identity.auth` for the live auth
 * seams) and this module is a read-only view over whichever of those exist. Reaching the auth
 * service directly from a screen would mean two places minting sessions, two places persisting
 * them, and two places to get token refresh wrong.
 *
 * Detection is by SHAPE, not by a hard-coded list of what the SDK has today. The SDK is another
 * wave's file; the day it grows `signInWithApple` or `signInWithPassword`, the button on this
 * screen lights up on its own, with no edit here. Until then the button is rendered disabled with
 * one honest line saying so — never hidden, because a door a learner expects and cannot find is
 * worse than a door that says it is not open yet.
 */

/** The ways in, in the order the screen offers them. */
export type MethodName = 'google' | 'apple' | 'password' | 'magicLink' | 'phone';

/**
 * The seam names each method would be wired to. More than one name means the SDK could reasonably
 * call it either thing; the first one present wins.
 */
export const METHOD_SEAMS: Readonly<Record<MethodName, readonly string[]>> = {
  google: ['signInWithGoogle'],
  apple: ['signInWithApple'],
  password: ['signInWithPassword', 'signInWithEmailPassword'],
  magicLink: ['signInWithMagicLink', 'requestEmailOtp', 'signInWithOtp'],
  phone: ['requestPhoneOtp'],
};

export interface MethodState {
  name: MethodName;
  /** The seam that will be called, or null when none is wired. */
  seam: string | null;
  available: boolean;
}

/** A bag of seams — whatever functions the client exposes, under their own names. */
export type Seams = Record<string, unknown> | null | undefined;

/**
 * Merge the seam objects into one lookup. Later objects do not overwrite earlier ones, so the
 * account layer (the one the app prefers) wins where both expose the same name.
 *
 * Every function is BOUND to the object it came from. The SDK's seams are closures today, but the
 * SDK is another wave's file and a plain prototype method one day would lose its `this` here and
 * fail at the worst possible moment — in front of somebody trying to sign in.
 */
export function mergeSeams(...sources: Seams[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of seamFunctions(source)) {
      if (!(key in merged)) merged[key] = value.bind(source);
    }
  }
  return merged;
}

type SeamFn = (...args: unknown[]) => unknown;

/**
 * Every callable on an object AND on its prototypes, up to (but not including) Object's own.
 *
 * Two details earn their place. `Object.keys` alone would miss a class method entirely — a
 * prototype method is not an own enumerable property — and the SDK's live identity IS a class, so
 * every door would have quietly shut the day the account layer stopped being an object literal.
 * And only DATA properties are read: a getter is skipped rather than invoked, because reading
 * somebody else's accessor to find out whether it happens to hold a function is a side effect we
 * have no business causing.
 */
function seamFunctions(source: object): [string, SeamFn][] {
  const found: [string, SeamFn][] = [];
  const seen = new Set<string>();
  let cursor: object | null = source;
  while (cursor && cursor !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(cursor)) {
      if (key === 'constructor' || seen.has(key)) continue;
      seen.add(key);
      const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
      if (descriptor && typeof descriptor.value === 'function') {
        found.push([key, descriptor.value as SeamFn]);
      }
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  return found;
}

/**
 * The seams that can actually DO something, out of the two the SDK exposes.
 *
 * This is the one piece of knowledge about the SDK's shape that has to live here, and it exists
 * because of a trap: in dev-mock mode `identity.auth` is a full set of correctly-named functions
 * that every one of them throws. Detecting those as wired would put five open-looking doors on the
 * screen, each of which fails the instant somebody presses it — the exact dishonesty the disabled
 * state exists to avoid.
 *
 * So: the account layer counts whenever it is there (it only exists when the keys are configured),
 * and `identity.auth` counts only under live auth, where it IS the real client.
 */
export function liveSeams(input: {
  account?: Seams;
  identityAuth?: Seams;
  /** `sdk.config.devAuth` — true means `identity.auth` is the throwing dev stub. */
  devAuth: boolean;
}): Record<string, unknown> {
  return mergeSeams(input.account, input.devAuth ? null : input.identityAuth);
}

/** Which seam a method would use here, or null when the client exposes none of them. */
export function seamFor(name: MethodName, seams: Record<string, unknown>): string | null {
  for (const candidate of METHOD_SEAMS[name]) {
    if (typeof seams[candidate] === 'function') return candidate;
  }
  return null;
}

/** The state of every method, for the screen to render. */
export function methodStates(seams: Record<string, unknown>): MethodState[] {
  return (Object.keys(METHOD_SEAMS) as MethodName[]).map((name) => {
    const seam = seamFor(name, seams);
    return { name, seam, available: seam !== null };
  });
}

/** True when at least one way in is actually wired. */
export function anyAvailable(states: readonly MethodState[]): boolean {
  return states.some((s) => s.available);
}

/** Call a method's seam (already bound by `mergeSeams`). */
export async function callSeam(
  seams: Record<string, unknown>,
  seam: string,
  ...args: unknown[]
): Promise<unknown> {
  const fn = seams[seam];
  if (typeof fn !== 'function') throw new Error(`no seam named ${seam}`);
  return await (fn as (...a: unknown[]) => unknown)(...args);
}
