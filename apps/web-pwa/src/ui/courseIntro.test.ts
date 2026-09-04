/**
 * The arrival art, held to the hand that drew it.
 *
 * The four drawings are Fable's, off the subjects page. This checks three things a redraw could
 * quietly lose: that every mark is still the one in design/prototypes/site-subjects.html, that the
 * ink stays inside DESIGN.md's 2.5–4px, and that a drawing carries exactly one accent pigment.
 * A snapshot per subject holds the whole drawing still on top of that.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ART_INK,
  ART_THIN,
  ART_VIEWBOX,
  artForSubject,
  artForTopic,
  SUBJECT_ART,
  type SubjectArtKey,
} from './courseIntro';

const REPO = join(import.meta.dir, '..', '..', '..', '..');
const TILES = readFileSync(join(REPO, 'design', 'prototypes', 'site-subjects.html'), 'utf8');

const KEYS: SubjectArtKey[] = ['mathematics', 'science', 'social', 'english'];

/** Palette v4's pigments, by the token name the drawing may reach for. */
const PIGMENTS = ['--pig', '--violet', '--rose', '--marigold', '--mint', '--lilac'];

describe('the marks are the site tiles, verbatim', () => {
  for (const key of KEYS) {
    it(`${key} draws only paths the prototype already drew`, () => {
      for (const mark of SUBJECT_ART[key].marks) {
        if (mark.el === 'path') expect(TILES, mark.d).toContain(`d="${mark.d}"`);
        if (mark.el === 'text') expect(TILES, mark.text).toContain(`>${mark.text}<`);
      }
    });
  }

  it('the benzene ring and the port are the prototype’s circles', () => {
    expect(TILES).toContain('cx="100" cy="80" r="30"');
    expect(TILES).toContain('cx="140" cy="60" r="6"');
  });

  it('the highlighter is the prototype’s rect', () => {
    expect(TILES).toContain('x="60" y="52" width="70" height="18" rx="6"');
  });

  it('and the drawing keeps the tiles’ own frame', () => {
    expect(TILES).toContain(`viewBox="${ART_VIEWBOX}"`);
  });
});

describe('one hand, one accent, no wash', () => {
  it('ink is 4px and nothing is thinner than 2.5', () => {
    expect(ART_INK).toBe(4);
    expect(ART_THIN).toBe(2.5);
    expect(ART_THIN).toBeGreaterThanOrEqual(2.5);
    expect(ART_INK).toBeLessThanOrEqual(4);
  });

  for (const key of KEYS) {
    it(`${key} carries exactly one accent pigment, on a tonal tile`, () => {
      const art = SUBJECT_ART[key];
      const accents = PIGMENTS.filter((p) => art.accent === `var(${p})`);
      expect(accents).toHaveLength(1);
      expect(art.tint).toMatch(/^var\(--(pig|violet|rose|marigold|mint|lilac)-w\)$/);
    });

    it(`${key} draws no shape wearing a wash`, () => {
      const serialised = JSON.stringify(SUBJECT_ART[key]);
      expect(serialised).not.toContain('opacity');
      expect(serialised).not.toContain('rgba');
    });
  }

  it('the highlighter goes down before the lines it marks', () => {
    const marks = SUBJECT_ART.english.marks;
    expect(marks[0]?.el).toBe('mark');
    expect(marks[1]?.el).toBe('path');
  });
});

describe('a subject opens on its own drawing', () => {
  it('resolves every family the curriculum knows', () => {
    expect(artForSubject('Mathematics')).toBe('mathematics');
    expect(artForSubject('math')).toBe('mathematics');
    expect(artForSubject('computer')).toBe('mathematics');
    expect(artForSubject('Physical Science')).toBe('science');
    expect(artForSubject('chemistry')).toBe('science');
    expect(artForSubject('biology')).toBe('science');
    expect(artForSubject('History, Civics and Geography')).toBe('social');
    expect(artForSubject('English')).toBe('english');
    expect(artForSubject('Second Language — Hindi')).toBe('english');
  });

  it('a subject nobody recognises still opens on a drawing', () => {
    expect(KEYS).toContain(artForSubject('Basket weaving'));
  });

  it('a topic resolves through its chapter, as the hues do', () => {
    expect(KEYS).toContain(artForTopic('m2-1'));
    expect(KEYS).toContain(artForTopic('no-such-topic'));
  });
});

describe('the drawing itself', () => {
  for (const key of KEYS) {
    it(`${key} is unchanged`, () => {
      expect(SUBJECT_ART[key]).toMatchSnapshot();
    });
  }
});
