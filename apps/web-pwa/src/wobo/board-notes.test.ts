import { describe, expect, it } from 'bun:test';
import { mergeNote, NOTES_CAP, noteTitle, type SavedBoard } from './board-notes';

const note = (id: string, savedAt = '2026-09-02T10:00:00.000Z'): SavedBoard => ({
  id,
  title: `board ${id}`,
  savedAt,
  objects: [],
});

describe('keeping a board', () => {
  it('puts the newest first', () => {
    const list = mergeNote([note('a'), note('b')], note('c'));
    expect(list.map((n) => n.id)).toEqual(['c', 'a', 'b']);
  });

  it('saving the same board again replaces it rather than duplicating it', () => {
    const list = mergeNote([note('a'), note('b')], note('a', '2026-09-03T10:00:00.000Z'));
    expect(list.map((n) => n.id)).toEqual(['a', 'b']);
    expect(list[0]?.savedAt).toBe('2026-09-03T10:00:00.000Z');
  });

  it('keeps only what a device should hold, dropping the oldest', () => {
    let list: SavedBoard[] = [];
    for (let i = 0; i < NOTES_CAP + 5; i++) list = mergeNote(list, note(`n${i}`));
    expect(list).toHaveLength(NOTES_CAP);
    expect(list[0]?.id).toBe(`n${NOTES_CAP + 4}`);
    expect(list.some((n) => n.id === 'n0')).toBe(false);
  });
});

describe('what a board is called', () => {
  it('takes the lesson it belongs to', () => {
    expect(noteTitle('Linear equations', 'course')).toBe('Linear equations');
  });
  it('falls back to where it was drawn', () => {
    expect(noteTitle(undefined, 'practice')).toBe('board from practice');
    expect(noteTitle('   ', 'home')).toBe('board from home');
  });
  it('is never empty, and never shouts', () => {
    expect(noteTitle(undefined, undefined)).toBe('a board');
    expect(noteTitle(undefined, undefined)).not.toMatch(/!/);
  });
});
