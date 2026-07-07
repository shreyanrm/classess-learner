/**
 * Smoke test for the beat-sync plan builder. Runs against the real cached refraction artifact when
 * present (per-scene measured audio) and against a synthetic artifact for the law edge-cases.
 * `bun test`.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'bun:test';
import { FPS, buildPlan, msToFrames } from './plan.ts';

const REPO = join(import.meta.dir, '..', '..', '..');
const REFRACTION = join(REPO, 'content/cache/video/refraction-of-light--core--8994385bde32.json');

test('msToFrames rounds to nearest frame, floor of 1', () => {
  expect(msToFrames(5611)).toBe(168); // 5.611s * 30 = 168.33
  expect(msToFrames(10491)).toBe(315);
  expect(msToFrames(1)).toBe(1); // never zero — a beat is at least one frame
});

test('measured audio duration beats authored durationMs (beat-sync law)', () => {
  const plan = buildPlan({
    provenance: { model: 'test' },
    artifact: {
      scenes: [
        {
          id: 'a',
          durationMs: 5000, // authored
          visual: { kind: 'svg', payload: '<svg viewBox="0 0 640 360"></svg>' },
          audio: { mime: 'audio/wav', b64: 'AAAA', durationMs: 5611 }, // measured wins
        },
        {
          id: 'b',
          durationMs: 4500, // no audio → authored fallback
          visual: { kind: 'svg', payload: '<svg viewBox="0 0 640 360"></svg>' },
        },
      ],
    },
  });
  expect(plan.scenes.map((s) => s.beatMs)).toEqual([5611, 4500]);
  expect(plan.totalFrames).toBe(msToFrames(5611) + msToFrames(4500));
  expect(plan.model).toBe('test');
});

test('non-svg scenes are dropped; hash is deterministic', () => {
  const art = {
    artifact: {
      scenes: [
        { id: 'sim', visual: { kind: 'sim', payload: '{}' }, durationMs: 6000 },
        { id: 'ok', visual: { kind: 'svg', payload: '<svg></svg>' }, durationMs: 6000 },
      ],
    },
  };
  const a = buildPlan(art);
  const b = buildPlan(structuredClone(art));
  expect(a.scenes.map((s) => s.id)).toEqual(['ok']);
  expect(a.sceneSpecHash).toBe(b.sceneSpecHash);
  expect(a.sceneSpecHash).toMatch(/^[0-9a-f]{16}$/);
});

test('empty / unrenderable artifact throws', () => {
  expect(() => buildPlan({ artifact: { scenes: [] } })).toThrow();
});

test.if(existsSync(REFRACTION))('real refraction artifact → beat-synced plan ~40.3s', () => {
  const plan = buildPlan(JSON.parse(readFileSync(REFRACTION, 'utf8')));
  expect(plan.scenes.length).toBe(6);
  // 5 scenes carry measured audio, the 6th falls back to authored duration
  expect(plan.scenes.filter((s) => s.audio).length).toBe(5);
  expect(plan.fps).toBe(FPS);
  // sum of measured beats is 40.315s; frame-quantised total must be within ±0.3s of that
  const framesSec = plan.totalFrames / FPS;
  expect(Math.abs(framesSec - plan.totalMs / 1000)).toBeLessThan(0.3);
  expect(plan.totalFrames).toBe(1210);
});
