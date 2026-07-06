'use client';

import { ATOM_TARGET_NODE_ID, type Sdk } from '@classess/sdk';
import { useVidyaBus } from '@classess/vidya';
import { PracticeSurface } from '../learn/PracticeSurface';
import { useRouter } from '../shell/router';

/**
 * PracticeScreen — unaided evidence, wrapped for the shell. The atom's verifier-frozen item bank backs
 * practice for the prototype; each correct answer nudges Vidya to celebrate from her dock, but she never
 * helps here. This is the learner's own work.
 */
export function PracticeScreen({ sdk }: { sdk: Sdk }) {
  const router = useRouter();
  const bus = useVidyaBus();

  return (
    <PracticeSurface
      sdk={sdk}
      // ponytail: the seeded atom bank is the only verified item set; the prototype practises against it.
      nodeId={ATOM_TARGET_NODE_ID}
      onEvidence={() => bus.dispatch([{ type: 'setMood', mood: 'correct' }])}
      onExit={() => router.back()}
    />
  );
}
