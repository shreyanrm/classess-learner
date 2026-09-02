"""Wall-clock-bounded execution for symbolic work — the CPU-burn door.

SymPy has no notion of a budget. ``factorial(400000)`` or a nested power written by a
learner (or by a caller pretending to be one) evaluates for as long as it takes, and in
this process that means a request thread pinned for minutes and a worker that stops
answering. A timeout that only *abandons* the work does not help: the CPU keeps burning.

So every parse and simplify runs in a separate process with a wall-clock budget, and on
overrun the process is **killed** and replaced. One worker, one call at a time: this is a
correctness substrate rather than a hot path, and serializing keeps "kill on overrun" from
taking unrelated in-flight work down with it. The worker is started once and reused, so
the SymPy import is paid before the first budgeted call rather than inside it.

The budget is ``VERIFIER_CAS_TIMEOUT_SECONDS`` (default 5s). Functions passed to
``run_bounded`` must be importable module-level functions with picklable arguments and
return values — the start method is ``spawn`` on every platform, deliberately, so the
worker never inherits this process's memory.
"""

from __future__ import annotations

import atexit
import contextlib
import multiprocessing
import os
import threading
from collections.abc import Callable, Sequence
from typing import Any

try:  # pragma: no cover - POSIX only; absent on Windows
    import resource
except ImportError:  # pragma: no cover
    resource = None  # type: ignore[assignment]

DEFAULT_TIMEOUT_SECONDS = 5.0
# Paid once, outside any budget: importing SymPy in a fresh interpreter is seconds on a
# cold filesystem, and that cost must not be charged to the first learner's expression.
STARTUP_TIMEOUT_SECONDS = 120.0
# Best effort: a memory bomb should die before the machine does. Silently ignored where the
# platform refuses the limit (macOS), which is why it is a backstop and not the control.
MEMORY_LIMIT_BYTES = 2 * 1024**3


def _timeout_from_env() -> float:
    raw = os.environ.get("VERIFIER_CAS_TIMEOUT_SECONDS", "").strip()
    if not raw:
        return DEFAULT_TIMEOUT_SECONDS
    try:
        value = float(raw)
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS
    return value if value > 0 else DEFAULT_TIMEOUT_SECONDS


#: Wall-clock budget for one symbolic call. Read at call time so tests can tighten it.
TIMEOUT_SECONDS = _timeout_from_env()


class SandboxError(RuntimeError):
    """Base class for sandbox failures — the work did not produce a verdict."""


class SandboxTimeout(SandboxError):
    """The call exceeded its wall-clock budget and its process was killed."""


class SandboxUnavailable(SandboxError):
    """The sandbox could not be started or lost its worker mid-call."""


_LOCK = threading.Lock()
_POOL: Any | None = None


def _init_worker() -> None:
    """Cap the child's memory where the platform allows, then warm the SymPy import."""
    if resource is not None:
        for name in ("RLIMIT_AS", "RLIMIT_DATA"):
            limit = getattr(resource, name, None)
            if limit is None:
                continue
            with contextlib.suppress(OSError, ValueError):
                _soft, hard = resource.getrlimit(limit)
                ceiling = MEMORY_LIMIT_BYTES
                if hard != resource.RLIM_INFINITY:
                    ceiling = min(ceiling, hard)
                resource.setrlimit(limit, (ceiling, hard))
    import sympy  # noqa: F401  (pay the import before anything is on the clock)


def _ping() -> bool:
    return True


def _start_pool() -> Any:
    ctx = multiprocessing.get_context("spawn")
    try:
        pool = ctx.Pool(processes=1, initializer=_init_worker)
    except (OSError, ValueError, AssertionError) as exc:
        raise SandboxUnavailable("could not start the symbolic sandbox") from exc
    try:
        pool.apply_async(_ping).get(timeout=STARTUP_TIMEOUT_SECONDS)
    except Exception as exc:  # noqa: BLE001 - any startup failure is the same failure
        with contextlib.suppress(Exception):
            pool.terminate()
            pool.join()
        raise SandboxUnavailable("the symbolic sandbox did not come up") from exc
    return pool


def _discard_pool_locked() -> None:
    """Kill the worker (caller holds ``_LOCK``). Killing is the point: it frees the CPU."""
    global _POOL
    pool, _POOL = _POOL, None
    if pool is None:
        return
    with contextlib.suppress(Exception):
        pool.terminate()
        pool.join()


def run_bounded(
    func: Callable[..., Any],
    args: Sequence[Any] = (),
    *,
    timeout: float | None = None,
) -> Any:
    """Run ``func(*args)`` in the sandbox worker and return its result.

    Exceptions raised by ``func`` propagate unchanged (they are pickled back), so callers
    keep their own error vocabulary. Overrun raises ``SandboxTimeout`` after the worker is
    killed; a worker that dies or never starts raises ``SandboxUnavailable``.
    """
    global _POOL
    budget = TIMEOUT_SECONDS if timeout is None else float(timeout)
    with _LOCK:
        if _POOL is None:
            _POOL = _start_pool()
        try:
            return _POOL.apply_async(func, tuple(args)).get(timeout=budget)
        except multiprocessing.TimeoutError as exc:
            _discard_pool_locked()
            raise SandboxTimeout(f"symbolic check exceeded its {budget:g}s budget") from exc
        except (EOFError, BrokenPipeError, ConnectionError, OSError) as exc:
            _discard_pool_locked()
            raise SandboxUnavailable("the symbolic sandbox worker died") from exc


def shutdown() -> None:
    """Stop the worker. Safe to call repeatedly; the next call starts a fresh one."""
    with _LOCK:
        _discard_pool_locked()


atexit.register(shutdown)
