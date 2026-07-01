import { describe, expect, it } from 'bun:test';
import { type Actor, type ClassessEvent, type Context, makeEvent } from '@classess/contracts';
import type { EventConsumer } from '../src/interface';
import { InMemoryKgtopg } from '../src/reference/in-memory';
import { InMemoryOutboxSource, type OutboxRow, runRelayOnce } from '../src/relay';

const actor: Actor = {
  subject_id: '00000000-0000-7000-8000-000000000001',
  surface: 'pwa',
  session_id: '00000000-0000-7000-8000-0000000000a1',
};
const context: Context = { app: 'learner', env: 'dev', consent_tier: 'un_elevated' };

function row(id: string, occurredAt: string): OutboxRow {
  const event: ClassessEvent = makeEvent({
    event_id: id,
    event_type: 'session.started.v1',
    occurred_at: occurredAt,
    actor,
    context,
    payload: { surface: 'pwa', app_version: '0.0.0', locale: 'en-IN', resumed: false },
  });
  return { eventId: id, occurredAt, subjectId: actor.subject_id, event };
}

describe('outbox relay', () => {
  it('publishes every unpublished row, at-least-once', async () => {
    const source = new InMemoryOutboxSource();
    const consumer = new InMemoryKgtopg();
    source.append(row('00000000-0000-7000-8000-0000000000c1', '2026-06-30T10:00:00Z'));
    source.append(row('00000000-0000-7000-8000-0000000000c2', '2026-06-30T10:01:00Z'));
    source.append(row('00000000-0000-7000-8000-0000000000c3', '2026-06-30T10:02:00Z'));

    const result = await runRelayOnce(source, consumer);
    expect(result.published).toBe(3);
    expect(result.failed).toBe(0);
    expect(source.isPublished('00000000-0000-7000-8000-0000000000c2')).toBe(true);
  });

  it('is idempotent: replaying an already-consumed event is a deduped no-op', async () => {
    const source = new InMemoryOutboxSource();
    const consumer = new InMemoryKgtopg();
    const r = row('00000000-0000-7000-8000-0000000000d1', '2026-06-30T10:00:00Z');
    await consumer.consume(r.event); // already consumed upstream
    source.append(r);

    const result = await runRelayOnce(source, consumer);
    expect(result.published).toBe(1);
    expect(result.deduped).toBe(1);
  });

  it('fetches rows ordered per aggregate (subject, then occurred_at)', async () => {
    const source = new InMemoryOutboxSource();
    source.append(row('00000000-0000-7000-8000-0000000000b3', '2026-06-30T10:02:00Z'));
    source.append(row('00000000-0000-7000-8000-0000000000b1', '2026-06-30T10:00:00Z'));
    source.append(row('00000000-0000-7000-8000-0000000000b2', '2026-06-30T10:01:00Z'));
    const fetched = await source.fetchUnpublished(10);
    expect(fetched.map((r) => r.occurredAt)).toEqual([
      '2026-06-30T10:00:00Z',
      '2026-06-30T10:01:00Z',
      '2026-06-30T10:02:00Z',
    ]);
  });

  it('marks a row failed (not published) when the consumer throws, so it replays', async () => {
    const source = new InMemoryOutboxSource();
    const throwing: EventConsumer = {
      consume: async () => {
        throw new Error('consumer down');
      },
    };
    source.append(row('00000000-0000-7000-8000-0000000000a9', '2026-06-30T10:00:00Z'));
    const result = await runRelayOnce(source, throwing);
    expect(result.failed).toBe(1);
    expect(source.isPublished('00000000-0000-7000-8000-0000000000a9')).toBe(false);
    expect(source.failures[0]?.error).toContain('consumer down');
  });
});
