/**
 * The keyless dev/mock identity, per DEVICE rather than per build.
 *
 * The SDK's default mock subject is one fixed UUID. That is fine on a laptop and wrong in a
 * bundle: a production build that still has dev auth on makes every visitor the same subject —
 * one daily budget, one consent tier, one archive, shared by strangers. A random id kept in
 * local storage is deterministic per browser and shared with nobody.
 *
 * A device that already has data under the old fixed id keeps that id. A security default is
 * not worth a learner's progress, and the id it inherits is only ever local to that device.
 */

export const DEVICE_SUBJECT_KEY = 'wobo.dev.subject';

export interface SimpleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  readonly length: number;
  key(index: number): string | null;
}

function keysOf(store: SimpleStorage): string[] {
  const out: string[] = [];
  for (let i = 0; i < store.length; i += 1) {
    const k = store.key(i);
    if (k) out.push(k);
  }
  return out;
}

/**
 * The subject this browser should use in keyless dev/mock mode, or `undefined` when storage is
 * unavailable (private mode, blocked cookies) — the SDK default then stands for that session.
 */
export function deviceMockSubject(
  legacyId: string,
  store: SimpleStorage | undefined = safeStorage(),
  newId: () => string = () => crypto.randomUUID(),
): string | undefined {
  if (!store) return undefined;
  try {
    const existing = store.getItem(DEVICE_SUBJECT_KEY);
    if (existing?.trim()) return existing.trim();
    // Scoped personal keys are written as `<key>::<subject>` (see store/scope.ts).
    const inherited = keysOf(store).some((k) => k.endsWith(`::${legacyId}`));
    const id = inherited ? legacyId : newId();
    store.setItem(DEVICE_SUBJECT_KEY, id);
    return id;
  } catch {
    return undefined;
  }
}

function safeStorage(): SimpleStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
