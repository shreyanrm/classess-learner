import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { handOffQuestion, takeHandedQuestion } from './handoff';

describe('a question handed from the public site to the runtime', () => {
  it('comes back exactly once, and never twice', () => {
    handOffQuestion('why does a² + b² = c²?');
    expect(takeHandedQuestion()).toBe('why does a² + b² = c²?');
    expect(takeHandedQuestion()).toBeNull();
  });

  it('is null when nobody asked anything', () => {
    expect(takeHandedQuestion()).toBeNull();
  });

  it('keeps only the last question — one slot, not a queue', () => {
    handOffQuestion('first');
    handOffQuestion('second');
    expect(takeHandedQuestion()).toBe('second');
    expect(takeHandedQuestion()).toBeNull();
  });
});

/**
 * The two halves have to stay wired to each other: the public site's stub parks the question, and
 * the runtime takes it the moment it mounts. Either half alone silently loses what a visitor typed.
 */
describe('both ends of the handover exist', () => {
  const read = (...p: string[]) => readFileSync(join(import.meta.dir, '..', ...p), 'utf8');

  it("the public site's chat stub parks the question rather than dropping it", () => {
    expect(read('site', 'PublicScope.tsx')).toContain('handOffQuestion(text)');
  });

  it('the runtime takes it on mount and asks it with the real engine', () => {
    const runtime = read('AppRuntime.tsx');
    expect(runtime).toContain('takeHandedQuestion()');
    expect(runtime).toContain('void askRef.current(handed)');
  });
});
