import { describe, expect, it } from 'bun:test';

/**
 * Two structural guards on effects that own real work. Both bugs are invisible in a unit test of
 * the store underneath them (the stores are fine) and only show up as a stranded workbook or a
 * doubled remote write in the app — so the shape of the effect is what we hold still here.
 */

const read = (path: string) => Bun.file(new URL(path, import.meta.url)).text();

describe('the forge build runner owns its work for the life of the effect', () => {
  it('has no cleanup: a cleanup here cancels the very build the effect just claimed', async () => {
    const source = await read('../src/store/DownloadCenter.tsx');
    const start = source.indexOf('// The forge build runner');
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf('}, [forged]);', start);
    expect(end).toBeGreaterThan(start);
    const effect = source.slice(start, end);

    // It really is the runner: it claims a forge and settles it.
    expect(effect).toContain('claimNextForge()');
    expect(effect).toContain('settleForge(');
    // Claiming fans a store event, which re-runs this effect — and a cleanup would then clear the
    // timer of the build in flight, stranding the workbook in "building" for ever.
    expect(effect).not.toContain('return () =>');
    expect(effect).not.toContain('clearTimeout');
  });
});

describe('learner state is persisted by an effect, never inside a setState updater', () => {
  it('saves once, keyed on the state, with a pure updater', async () => {
    const source = await read('../src/store/progress.tsx');
    // Exactly one save site in the whole store…
    expect(source.split('sdk.state.save(').length - 1).toBe(1);
    // …and it is an effect keyed on the state that produced it.
    expect(
      /useEffect\(\(\) => \{[\s\S]*?sdk\.state\.save\(state\);[\s\S]*?\}, \[sdk, state\]\);/.test(
        source,
      ),
    ).toBe(true);
    // The stamp helper the updaters call is pure: it returns the next state and writes nothing.
    const stamp = source.slice(source.indexOf('const stamp = useCallback('));
    expect(stamp.slice(0, stamp.indexOf('\n  );'))).not.toContain('sdk.state');
  });
});
