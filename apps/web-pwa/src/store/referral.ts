/**
 * The referral code that travels in an invite link.
 *
 * An invite is copied into WhatsApp, pasted into a class group, forwarded on. Whatever rides in the
 * URL is public — so it must not be the child. The link used to carry the learner's real name
 * (`?via=asha-mehta`), which put a minor's name into every forwarded message and every referrer
 * header downstream. It now carries an opaque code that means nothing outside this device: it
 * identifies the invitation, never the person.
 *
 * The code is stable per device (the same learner's links stay the same, so a re-copy is not a new
 * identity) and lives under the `wobo-` prefix, so "erase and start over" takes it with everything
 * else.
 */

const REFERRAL_KEY = 'wobo-referral-code-v1';
/** 8 chars of base32 — ~40 bits: collision-free at any plausible scale, still short enough to read. */
const CODE_LENGTH = 8;
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'; // no 0/1/i/l/o — a code gets read aloud

/** A fresh opaque code. Pure: pass the byte source, get the code. */
export function newReferralCode(bytes: Uint8Array): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
  }
  return code;
}

function randomBytes(): Uint8Array {
  const bytes = new Uint8Array(CODE_LENGTH);
  try {
    crypto.getRandomValues(bytes);
    return bytes;
  } catch {
    // No WebCrypto (very old browser, exotic embedding): a code that is merely unguessable-enough
    // is still infinitely better than the learner's name.
    for (let i = 0; i < CODE_LENGTH; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    return bytes;
  }
}

/**
 * This device's referral code, minted on first use. Storage failures (private mode) fall back to a
 * per-call code rather than throwing — the invitation still works, it simply is not stable.
 */
export function referralCode(): string {
  try {
    const existing = localStorage.getItem(REFERRAL_KEY);
    if (existing) return existing;
    const code = newReferralCode(randomBytes());
    localStorage.setItem(REFERRAL_KEY, code);
    return code;
  } catch {
    return newReferralCode(randomBytes());
  }
}

/** The invite URL for a kind of guest. The only place an invite link is built. */
export function inviteLink(origin: string, kind: 'friend' | 'parent', code: string): string {
  const params = new URLSearchParams({ via: code, as: kind });
  return `${origin.replace(/\/+$/, '')}/join?${params.toString()}`;
}
