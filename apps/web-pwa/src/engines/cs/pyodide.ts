'use client';

/**
 * Lazy Pyodide — the real CPython-on-WASM runtime, loaded once, on demand, from the CDN (≈10 MB of
 * WASM is never in our bundle and never fetched until the learner presses Run). Everything the CS
 * ramp validates runs here: "run the code and check the output" is the strongest validator we have
 * (SUBJECTS.md §5-CS). ExecViz also asks Python to trace itself — see runTraced below.
 */

// biome-ignore lint/suspicious/noExplicitAny: Pyodide has no bundled types (loaded from CDN at runtime)
type Pyodide = any;

const PYODIDE_VERSION = 'v0.26.4';
const CDN = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

let pyodidePromise: Promise<Pyodide> | null = null;

/**
 * Cut the bridge from Python back into the page.
 *
 * Pyodide runs on the page's own origin, and by default it hands Python a live `js` module that IS
 * `globalThis`: `from js import document` reaches the DOM, `js.localStorage` reaches the learner's
 * dossier and their session token, and `js.fetch` is a same-origin request with their cookies. The
 * code being run is typed into an editor by a child — or arrives in a generated exercise — so it
 * must not be able to reach any of that.
 *
 * Two locks, because either alone is soft:
 *  1. `jsglobals: new Map()` — the namespace `js` is built from is an empty map, not `globalThis`,
 *     so even a re-import finds nothing to reach.
 *  2. An import hook that refuses `js` and `pyodide_js` outright, so the failure is loud and early
 *     ("ImportError") instead of a mysterious AttributeError three lines later.
 *
 * ponytail: the stronger isolation is a Web Worker (a separate global scope with no DOM at all),
 * which is the upgrade path if the CS ramp ever needs to run untrusted code from other learners.
 * Both locks below survive that move unchanged.
 */
export const ISOLATION = `
def _install_host_bridge_guard():
    import sys

    blocked = {'js', 'pyodide_js'}

    class _NoHostBridge:
        """Refuses the modules that bridge Python back into the page."""

        def find_spec(self, fullname, path=None, target=None):
            if fullname.split('.')[0] in blocked:
                raise ImportError(fullname + ' is not available here')
            return None

    for name in [m for m in sys.modules if m.split('.')[0] in blocked]:
        del sys.modules[name]
    sys.meta_path.insert(0, _NoHostBridge())

_install_host_bridge_guard()
del _install_host_bridge_guard
`;

/** Loads (once) and returns the shared Pyodide instance. The WASM is fetched lazily from the CDN. */
export function getPyodide(): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      // A runtime URL string keeps Vite/TS from trying to resolve or bundle the module.
      const mod = await import(/* @vite-ignore */ `${CDN}pyodide.mjs`);
      // jsglobals is the object the `js` module is a view of. An empty Map means Python's view of
      // the page is empty — no document, no localStorage, no fetch, no cookies.
      const py = await mod.loadPyodide({ indexURL: CDN, jsglobals: new Map() });
      py.runPython(ISOLATION);
      return py;
    })().catch((e) => {
      // let the next Run retry a cold load rather than latch a rejected promise forever
      pyodidePromise = null;
      throw e;
    });
  }
  return pyodidePromise;
}

// --- The result shapes ----------------------------------------------------------------------------

/** One executed source line — the machine's state at that instant, deterministic and replayable. */
export interface TraceStep {
  /** 1-based line number in the user's source that is about to run. */
  line: number;
  /** Variables visible in the current frame, name → short repr. */
  locals: Record<string, string>;
  /** Call stack, outermost ('<module>') to innermost function name. */
  stack: string[];
  /** Length of stdout captured up to (and including) this step — lets the UI reveal output in time. */
  out: number;
}

export interface RunResult {
  steps: TraceStep[];
  stdout: string;
  /** Present when the program raised — shown, never thrown (a generated demo must never crash us). */
  error: string | null;
}

/** Plain `exec` with stdout capture — the output validator. No tracing, so no per-line overhead. */
export interface OutputResult {
  stdout: string;
  error: string | null;
}

// --- The Python side ------------------------------------------------------------------------------
// A self-contained harness. It reads the user source from the `_src` global, runs it under
// sys.settrace, and returns a JSON string. Line events are recorded only for the '<user>' code
// object, so the tracer never leaks into its own machinery. A hard step cap turns an infinite loop
// into a clean, shown error instead of a hung tab.

const TRACE_HARNESS = `
import sys, io, json

_LIMIT = 6000

def _snap(v):
    try:
        if v is None or isinstance(v, bool) or isinstance(v, (int, float)):
            return repr(v)
        if isinstance(v, str):
            return repr(v) if len(v) <= 42 else repr(v[:39] + '...')
        r = repr(v)
        return r if len(r) <= 64 else r[:61] + '...'
    except Exception:
        return '<?>'

_steps = []
_out = io.StringIO()

def _trace(frame, event, arg):
    if frame.f_code.co_filename != '<user>':
        return _trace
    if event == 'line':
        if len(_steps) >= _LIMIT:
            raise RuntimeError('step limit reached (' + str(_LIMIT) + ') — is this loop infinite?')
        stack = []
        f = frame
        while f is not None:
            if f.f_code.co_filename == '<user>':
                stack.append(f.f_code.co_name)
            f = f.f_back
        stack.reverse()
        loc = {}
        for k, v in list(frame.f_locals.items()):
            if k.startswith('__'):
                continue
            loc[k] = _snap(v)
        _steps.append({'line': frame.f_lineno, 'locals': loc,
                       'stack': stack, 'out': _out.tell()})
    return _trace

_err = None
_old = sys.stdout
sys.stdout = _out
try:
    _code = compile(_src, '<user>', 'exec')
    sys.settrace(_trace)
    exec(_code, {'__name__': '__main__'})
except SyntaxError as e:
    _err = 'SyntaxError: ' + str(e.msg) + ' (line ' + str(e.lineno) + ')'
except Exception as e:
    _err = type(e).__name__ + ': ' + str(e)
finally:
    sys.settrace(None)
    sys.stdout = _old

json.dumps({'steps': _steps, 'stdout': _out.getvalue(), 'error': _err})
`;

const OUTPUT_HARNESS = `
import sys, io, json
_out = io.StringIO()
_err = None
_old = sys.stdout
sys.stdout = _out
try:
    exec(compile(_src, '<user>', 'exec'), {'__name__': '__main__'})
except SyntaxError as e:
    _err = 'SyntaxError: ' + str(e.msg) + ' (line ' + str(e.lineno) + ')'
except Exception as e:
    _err = type(e).__name__ + ': ' + str(e)
finally:
    sys.stdout = _old
json.dumps({'stdout': _out.getvalue(), 'error': _err})
`;

async function run(harness: string, source: string): Promise<string> {
  const py = await getPyodide();
  py.globals.set('_src', source);
  try {
    return await py.runPythonAsync(harness);
  } finally {
    py.globals.delete('_src');
  }
}

/** Runs the source under a line tracer and returns the full, scrubbable step log + captured output. */
export async function runTraced(source: string): Promise<RunResult> {
  const parsed = JSON.parse(await run(TRACE_HARNESS, source)) as RunResult;
  return { steps: parsed.steps ?? [], stdout: parsed.stdout ?? '', error: parsed.error ?? null };
}

/** Runs the source for its output only — the answer validator behind Parsons and Block assembly. */
export async function runOutput(source: string): Promise<OutputResult> {
  const parsed = JSON.parse(await run(OUTPUT_HARNESS, source)) as OutputResult;
  return { stdout: parsed.stdout ?? '', error: parsed.error ?? null };
}

// ponytail: WASM is CDN-loaded and version-pinned; if we ever need offline runs, self-host the
// pyodide dir under /public and point CDN at it — same code, different base URL.
