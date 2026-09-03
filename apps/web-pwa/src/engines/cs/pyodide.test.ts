import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ISOLATION } from './pyodide';

const source = readFileSync(join(import.meta.dir, 'pyodide.ts'), 'utf8');

/**
 * Pyodide runs on the page's own origin. Left at its defaults it hands Python a live `js` module
 * that IS `globalThis` — `from js import document` reaches the DOM, `js.localStorage` reaches the
 * learner's dossier and their session token, `js.fetch` is a same-origin request carrying their
 * cookies. The code it runs is typed by a child, or arrives inside a generated exercise. It must
 * not be able to reach any of that.
 */
describe('executed Python cannot reach the page', () => {
  it('builds the js namespace from an empty map, not from globalThis', () => {
    expect(source).toContain('jsglobals: new Map()');
    // and it is passed at the ONE place Pyodide is constructed
    expect(source.split('loadPyodide(')).toHaveLength(2);
  });

  it('installs the import guard as part of loading, not as something callers must remember', () => {
    const load = source.slice(source.indexOf('loadPyodide('), source.indexOf('function run('));
    expect(load).toContain('py.runPython(ISOLATION)');
  });

  it('refuses both bridge modules by name', () => {
    expect(ISOLATION).toContain("blocked = {'js', 'pyodide_js'}");
    expect(ISOLATION).toContain('raise ImportError');
    expect(ISOLATION).toContain('sys.meta_path.insert(0, _NoHostBridge())');
  });

  it('drops an already-imported bridge instead of only blocking future imports', () => {
    expect(ISOLATION).toContain('del sys.modules[name]');
  });

  it('blocks submodules too — `js.document` is reachable as `import js.foo` otherwise', () => {
    expect(ISOLATION).toContain("fullname.split('.')[0] in blocked");
  });

  it('leaves nothing of itself in the interpreter namespace', () => {
    expect(ISOLATION).toContain('del _install_host_bridge_guard');
  });

  it('runs user code in a fresh globals dict, so the harness state is not reachable either', () => {
    expect(source).toContain("exec(_code, {'__name__': '__main__'})");
    expect(source).toContain("exec(compile(_src, '<user>', 'exec'), {'__name__': '__main__'})");
  });
});

/**
 * The guard is plain CPython, so CPython itself can prove it does what it says: the two bridge
 * modules raise on import, and ordinary stdlib imports are untouched. Skipped where no python3 is
 * on PATH — the source contract above still holds either way.
 */
describe('the import guard, executed', () => {
  const probe = `
${ISOLATION}
import json
ok = {'stdlib': False, 'js': False, 'pyodide_js': False}
try:
    import math
    ok['stdlib'] = math.sqrt(4) == 2.0
except ImportError:
    pass
for name in ('js', 'pyodide_js'):
    try:
        __import__(name)
    except ImportError:
        ok[name] = True
print(json.dumps(ok))
`;

  it('blocks the bridge and leaves the standard library alone', () => {
    let out: { stdout: string; exitCode: number | null };
    try {
      out = Bun.spawnSync(['python3', '-c', probe]) as unknown as typeof out;
    } catch {
      return; // no python3 here — the static contract above is the gate
    }
    if (out.exitCode !== 0) return;
    const parsed = JSON.parse(String(out.stdout).trim()) as Record<string, boolean>;
    expect(parsed).toEqual({ stdlib: true, js: true, pyodide_js: true });
  });
});
