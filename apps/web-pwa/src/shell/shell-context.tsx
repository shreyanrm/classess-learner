'use client';

import { createContext, useContext } from 'react';

/** Shell-level affordances screens can reach (the frosted sheets that float above the app). */
export interface ShellApi {
  openMeter: () => void;
  openConversion: () => void;
}

const Ctx = createContext<ShellApi | null>(null);
export const ShellProvider = Ctx.Provider;

export function useShell(): ShellApi {
  const s = useContext(Ctx);
  if (!s) throw new Error('useShell must be used within AppShell');
  return s;
}
