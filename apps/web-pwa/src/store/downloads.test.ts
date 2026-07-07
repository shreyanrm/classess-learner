import { beforeEach, describe, expect, it } from 'bun:test';
import {
  acknowledge,
  claimNext,
  enqueue,
  getDownload,
  getDownloads,
  markFailed,
  markReady,
  positionOf,
} from './downloads';

// The store is a module singleton (localStorage in the app, in-memory here). Between tests we
// settle any active work so nothing leaks the one-in-flight guard forward; each test uses its own
// topic ids so a prior test's ready entry never de-dupes a fresh enqueue.
beforeEach(() => {
  for (const d of [...getDownloads()]) {
    if (d.status === 'queued' || d.status === 'downloading') markReady(d.topicId);
    acknowledge(d.topicId);
  }
});

describe('download queue — the on-first-start generation store', () => {
  it('one in flight per learner: claimNext promotes exactly one, then holds', () => {
    enqueue('one-a', 'A');
    enqueue('one-b', 'B');
    const first = claimNext();
    expect(first?.topicId).toBe('one-a'); // FIFO — oldest first
    expect(getDownload('one-a')?.status).toBe('downloading');
    expect(claimNext()).toBeUndefined(); // refused while one is downloading
  });

  it('the next course is claimed only once the current one settles', () => {
    enqueue('nxt-a', 'A');
    enqueue('nxt-b', 'B');
    claimNext();
    markReady('nxt-a');
    expect(claimNext()?.topicId).toBe('nxt-b');
  });

  it('enqueue de-dupes an in-flight/queued topic but re-arms a failed one', () => {
    enqueue('dup-a', 'A');
    enqueue('dup-a', 'A'); // ignored — already in line
    expect(getDownloads().filter((d) => d.topicId === 'dup-a')).toHaveLength(1);
    claimNext();
    markFailed('dup-a');
    enqueue('dup-a', 'A'); // a slip can be retried
    expect(getDownload('dup-a')?.status).toBe('queued');
  });

  it('position reports the place in line; a settled course leaves it', () => {
    enqueue('pos-a', 'A');
    enqueue('pos-b', 'B');
    expect(positionOf('pos-a')).toBe(1);
    expect(positionOf('pos-b')).toBe(2);
    claimNext();
    markReady('pos-a');
    expect(positionOf('pos-a')).toBe(0); // ready — no longer waiting
    expect(positionOf('pos-b')).toBe(1); // moved up
  });

  it('ready surfaces once (seen=false), then acknowledge clears the toast, keeps the status', () => {
    enqueue('rdy-a', 'A');
    claimNext();
    markReady('rdy-a');
    expect(getDownload('rdy-a')?.seen).toBe(false);
    acknowledge('rdy-a');
    expect(getDownload('rdy-a')?.seen).toBe(true);
    expect(getDownload('rdy-a')?.status).toBe('ready');
  });
});
