'use client';

/**
 * The rail's allowance card, fed by the brain (WOBO-PLAN §16): `GET /v1/me` says how many turns are
 * left today and when they come back. One answer is shared across every screen that mounts the
 * shell and held for a minute, so walking Home → Learn → Home does not ask three times.
 */

import type { Me, Sdk } from '@wobo/sdk';
import { useEffect, useState } from 'react';
import {
  type Allowance,
  allowanceLine,
  readAllowance,
  resetTime,
} from '../screens/plans/allowance';
import { useSdk } from '../store/sdk';

const FRESH_MS = 60_000;

let last: { at: number; me: Me | null } | null = null;
let inflight: Promise<Me | null> | null = null;

function fetchMe(sdk: Sdk): Promise<Me | null> {
  if (last && Date.now() - last.at < FRESH_MS) return Promise.resolve(last.me);
  if (!inflight) {
    inflight = sdk
      .me()
      .then((me) => {
        last = { at: Date.now(), me };
        return me;
      })
      .catch(() => last?.me ?? null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Tests only: forget the shared answer. */
export function resetAllowanceCache(): void {
  last = null;
  inflight = null;
}

export function useAllowance(): Allowance {
  const sdk = useSdk();
  const [me, setMe] = useState<Me | null>(() => last?.me ?? null);
  useEffect(() => {
    let live = true;
    void fetchMe(sdk).then((next) => {
      if (live) setMe(next);
    });
    return () => {
      live = false;
    };
  }, [sdk]);
  return readAllowance(me);
}

/**
 * The card's line — "25 of 40 turns left · resets 6:00 am" — from the numbers the brain gave and
 * nothing else. An allowance that could not be read says so in the sentence the plans page uses.
 */
export function allowanceNote(allowance: Allowance, now: Date = new Date()): string {
  if (!allowance.known || allowance.remaining === null) return allowanceLine(allowance);
  const of = allowance.limit !== null ? ` of ${allowance.limit}` : '';
  const at = allowance.resetsAt;
  const resets =
    at && at.getTime() > now.getTime() - 86_400_000
      ? ` · resets ${resetTime(at).replace(/\b(AM|PM)\b/, (m) => m.toLowerCase())}`
      : '';
  return `${allowance.remaining}${of} turns left${resets}`;
}

/** 0..1 for the marigold bar; undefined when there is no limit to draw against. */
export function allowanceProgress(allowance: Allowance): number | undefined {
  if (allowance.remaining === null || allowance.limit === null || allowance.limit <= 0) {
    return undefined;
  }
  return allowance.remaining / allowance.limit;
}
