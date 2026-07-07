/**
 * The universal-frame drift guard. For every board+grade the app can assemble a frame from
 * (content/catalogs/*.json), the built frame MUST match its source exactly — subjects, chapters, and
 * topics, in order — and produce a clean, uniquely-keyed shape the app can navigate. This is the wire
 * (wave-13's CBSE-10 pattern, generalized): if the builder's mapping drifts from the catalogs, or a
 * catalog changes shape, it fails and names the board+grade that broke.
 */

import { describe, expect, it } from 'bun:test';
import ap from '../../../content/catalogs/ap.json';
import cbse from '../../../content/catalogs/cbse.json';
import icse from '../../../content/catalogs/icse.json';
import karnataka from '../../../content/catalogs/karnataka.json';
import maharashtra from '../../../content/catalogs/maharashtra.json';
import telangana from '../../../content/catalogs/telangana.json';
import { buildFrame, type JsonGrade } from '../src/data/frame';

const BOARDS: Record<string, { grades: JsonGrade[] }> = {
  cbse: cbse as { grades: JsonGrade[] },
  telangana: telangana as { grades: JsonGrade[] },
  karnataka: karnataka as { grades: JsonGrade[] },
  icse: icse as { grades: JsonGrade[] },
  ap: ap as { grades: JsonGrade[] },
  maharashtra: maharashtra as { grades: JsonGrade[] },
};

describe('universal frame matches every board catalog, per grade', () => {
  for (const [boardId, catalog] of Object.entries(BOARDS)) {
    describe(boardId, () => {
      for (const slice of catalog.grades) {
        it(`${slice.grade}: subjects, chapters, and topics match in order`, () => {
          const frame = buildFrame(boardId, slice.grade, slice);

          // one door per subject, in the board's own naming and order
          expect(frame.doors.map((d) => d.id)).toEqual(slice.subjects.map((s) => s.id));
          expect(frame.doors.map((d) => d.name)).toEqual(slice.subjects.map((s) => s.name));

          for (const subject of slice.subjects) {
            const built = frame.chaptersBySubject[subject.id];
            expect(built).toBeDefined();
            expect(built?.map((c) => c.name)).toEqual(subject.chapters.map((c) => c.name));
            for (let i = 0; i < subject.chapters.length; i++) {
              expect(built?.[i]?.topics.map((t) => t.name)).toEqual(
                (subject.chapters[i]?.topics ?? []).map((t) => t.name),
              );
            }
          }
        });

        it(`${slice.grade}: every topic id is unique and resolvable`, () => {
          const frame = buildFrame(boardId, slice.grade, slice);
          const ids = Object.values(frame.chaptersBySubject)
            .flat()
            .flatMap((c) => c.topics.map((t) => t.id));
          expect(ids.length).toBeGreaterThan(0);
          expect(new Set(ids).size).toBe(ids.length);
        });
      }
    });
  }
});
