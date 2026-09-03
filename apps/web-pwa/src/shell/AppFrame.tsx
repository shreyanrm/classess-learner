'use client';

/**
 * The authenticated app's frame — the kit's AppShell wired to the router and to the learner's real
 * allowance. A screen behind one of the four doors mounts this and puts a <TopBar> first.
 *
 *   <AppFrame active="home">
 *     <TopBar crumb="…" right={…} />
 *     …
 *   </AppFrame>
 */

import type { ReactNode } from 'react';
import { AllowanceCard, AppShell, type NavId } from '../ui/primitives';
import { useRouter } from './router';
import { allowanceNote, allowanceProgress, useAllowance } from './useAllowance';

export interface AppFrameProps {
  active: NavId;
  children: ReactNode;
  /** What the rail's bottom slot holds instead of the allowance — a lesson's hold-to-talk pill. */
  bottom?: ReactNode;
}

export function AppFrame({ active, children, bottom }: AppFrameProps) {
  const router = useRouter();
  const allowance = useAllowance();
  const progress = allowanceProgress(allowance);
  return (
    <AppShell
      active={active}
      onNavigate={(id) => router.navigate({ name: id })}
      bottom={
        bottom ?? (
          <AllowanceCard
            title="Today's allowance"
            {...(progress === undefined ? {} : { progress })}
            note={allowanceNote(allowance)}
          />
        )
      }
    >
      {children}
    </AppShell>
  );
}
