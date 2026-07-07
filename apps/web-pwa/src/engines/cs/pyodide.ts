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

/** Loads (once) and returns the shared Pyodide instance. The WASM is fetched lazily from the CDN. */
export function getPyodide(): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      // A runtime URL string keeps Vite/TS from trying to resolve or bundle the module.
      const mod = await import(/* @vite-ignore */ `${CDN}pyodide.mjs`);
      return mod.loadPyodide({ indexURL: CDN });
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
