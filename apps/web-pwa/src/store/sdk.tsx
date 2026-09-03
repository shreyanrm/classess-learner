'use client';

/** The SDK, available to every surface — events, content, mastery views, the model router. */

import type { Sdk } from '@wobo/sdk';
import { createContext, useContext } from 'react';

const Ctx = createContext<Sdk | null>(null);
export const SdkProvider = Ctx.Provider;

export function useSdk(): Sdk {
  const sdk = useContext(Ctx);
  if (!sdk) throw new Error('useSdk must be used within the app');
  return sdk;
}
