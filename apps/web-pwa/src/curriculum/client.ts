/**
 * The app's one curriculum client.
 *
 * Bound lazily to the gateway URL so importing this module costs nothing and a test can swap the
 * whole client for a stub before any screen mounts. There is no offline fallback client and no
 * bundled catalog behind it: with no gateway configured the app has no syllabus to show, and says
 * so, which is the honest state (CURRICULUM.md §11).
 */

import { type CurriculumClient, createCurriculumClient } from '@wobo/sdk';

let override: CurriculumClient | null = null;
let built: CurriculumClient | null = null;

/** The gateway origin, from the build env. Empty in a keyless build — see `curriculumReady`. */
export function gatewayUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_GATEWAY_URL?.trim() ?? '';
}

/** True when there is a brain to ask. False means every screen shows its empty state, honestly. */
export function curriculumReady(): boolean {
  return Boolean(override) || gatewayUrl().length > 0;
}

export function curriculum(): CurriculumClient {
  if (override) return override;
  if (!built) built = createCurriculumClient(gatewayUrl());
  return built;
}

/** Tests and Storybook-style harnesses swap the client here; passing null restores the real one. */
export function setCurriculumClient(client: CurriculumClient | null): void {
  override = client;
  built = null;
}
