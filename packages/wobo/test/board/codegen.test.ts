import { describe, expect, it } from 'bun:test';
import { MIRROR_PATH, renderPythonMirror } from '../../scripts/board-schema-codegen';

const MIRROR = new URL(`../../../../${MIRROR_PATH}`, import.meta.url).pathname;

describe('the brain validates the same grammar as the hand', () => {
  it('the committed Python mirror is current', async () => {
    const onDisk = await Bun.file(MIRROR).text();
    expect(onDisk).toBe(renderPythonMirror());
  });

  it('is deterministic — codegen never churns the diff', () => {
    expect(renderPythonMirror()).toBe(renderPythonMirror());
  });

  it('carries the object, patch and event schemas, plus the verified-number law', () => {
    const py = renderPythonMirror();
    for (const symbol of [
      'BOARD_OBJECT_SCHEMA',
      'BOARD_PATCH_SCHEMA',
      'BOARD_EVENT_SCHEMA',
      'BOARD_PLAN_SCHEMA',
      'def is_drawable',
      'def parse_board_plan',
      'def refuse_unverified',
      'GENERATED FILE',
    ]) {
      expect(py).toContain(symbol);
    }
  });

  it('mirrors every kind name', () => {
    const py = renderPythonMirror();
    for (const kind of ['point', 'wipe', 'tex', 'bond', 'slider', 'drag']) {
      expect(py).toContain(`"${kind}"`);
    }
  });
});
