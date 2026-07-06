'use client';

import { ATOM_TARGET_NODE_ID, type Sdk } from '@classess/sdk';
import { useEffect, useState } from 'react';
import { LearnSurface } from '../learn/LearnSurface';
import { nodeById } from '../mock/appData';
import { useRouter } from '../shell/router';

/** appData node id ⇄ the live atom. Only the atom is verifier-backed; the rest run on seed openers. */
export const ATOM_APPDATA_ID = 'linear-one-var';

interface Opener {
  equation: string;
  prompt: string;
}

/** A representative opener per concept so every node poses something concrete (the atom is live). */
const SEED_OPENERS: Record<string, Opener> = {
  'two-step': {
    equation: '2x + 3 = 7',
    prompt: 'Find x. Do it in two clean moves, in the right order.',
  },
  'like-terms': { equation: '3x + 2x + 4', prompt: 'Tidy this expression as far as it will go.' },
  distribute: { equation: '2(x + 3)', prompt: 'Open the bracket without losing a term.' },
  'one-step': { equation: 'x + 7 = 12', prompt: 'One move finds x. Which move?' },
  'word-problems': {
    equation: 'A number tripled, plus 4, is 19.',
    prompt: 'Turn the sentence into an equation, then solve it.',
  },
};

const DEFAULT_OPENER: Opener = { equation: '2x + 3 = 7', prompt: 'Find x. Show each step.' };

/**
 * LearnScreen — the atom loop, wrapped for the shell. It sources a verified opener for the atom (or a
 * seed opener for a neighbour), then hands control to the shared LearnSurface, which publishes the
 * working canvas to Vidya's bus. Asking Vidya runs a real turn (see App.ask).
 */
export function LearnScreen({
  sdk,
  nodeId,
  onAsk,
}: {
  sdk: Sdk;
  nodeId: string;
  onAsk: (text: string) => void;
}) {
  const router = useRouter();
  const node = nodeById(nodeId);
  const isAtom = nodeId === ATOM_APPDATA_ID;
  const [opener, setOpener] = useState<Opener>(SEED_OPENERS[nodeId] ?? DEFAULT_OPENER);

  useEffect(() => {
    if (!isAtom) return;
    let live = true;
    sdk.content.getVerified(ATOM_TARGET_NODE_ID, 'opener').then((item) => {
      const body = item?.body as Opener | undefined;
      if (live && body?.equation) setOpener({ equation: body.equation, prompt: body.prompt });
    });
    return () => {
      live = false;
    };
  }, [sdk, isAtom]);

  return (
    <LearnSurface
      equation={opener.equation}
      prompt={opener.prompt}
      nodeId={isAtom ? ATOM_TARGET_NODE_ID : nodeId}
      nodeName={node?.name ?? 'Linear equations in one variable'}
      onAsk={onAsk}
      onPractice={() => router.navigate({ name: 'practice', nodeId })}
      onExit={() => router.back()}
    />
  );
}
