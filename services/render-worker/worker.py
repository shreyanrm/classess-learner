#!/usr/bin/env python3
"""Render-worker drain loop — the out-of-band process that turns queued video artifacts into MP4s.

The gateway appends one job per canonical video promotion to ``content/cache/_render-queue.jsonl``
(see INTEGRATION.md / plexus.validate). This loop drains that queue and, per job, runs the Remotion
CLI (``node src/render.ts --artifact <path>``) which writes the MP4 + render-manifest.json beside the
artifact. It then marks the job DONE by APPENDING a status line to the SAME jsonl — append-only, so
the retention law holds (no line is ever rewritten or deleted; a done job simply gains a later
``{"status":"done", ...}`` record, and a done spec is skipped on the next pass).

Operator-run / cron ONLY — this is deliberately NOT wired into the gateway process (Remotion's heavy,
licence-encumbered deps must never load in the gateway). Pure stdlib: no dependency of its own.

  # one pass (cron):        python worker.py --once
  # continuous sidecar:     python worker.py            # loops, --interval seconds (default 15)
  # self-check (no render): python worker.py --selftest

``RENDER_QUEUE_PATH`` overrides the queue location; ``RENDER_CMD`` overrides the render command
(default ``node src/render.ts``, matching package.json's ``render`` script).
"""

from __future__ import annotations

import json
import os
import shlex
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

PKG_DIR = Path(__file__).resolve().parent
QUEUE_PATH = Path(
    os.getenv("RENDER_QUEUE_PATH")
    or PKG_DIR.parents[1] / "content" / "cache" / "_render-queue.jsonl"
)
RENDER_CMD = os.getenv("RENDER_CMD", "node src/render.ts")


def _job_key(rec: dict) -> str:
    """Identity of a render spec: the worker's own sceneSpecHash if the enqueuer set one, else the
    artifact path. A status line shares its job's key so a done/error spec is skipped next pass."""
    return str(rec.get("sceneSpecHash") or rec.get("artifact") or "")


def _read(path: Path) -> list[dict]:
    if not path.exists():
        return []
    out: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue  # a torn line (concurrent append) is skipped, not fatal
    return out


def pending_jobs(records: list[dict]) -> list[dict]:
    """Jobs not yet terminal. A record with a ``status`` is a status line; its key marks that spec
    done/errored (terminal — a changed spec is a new key and re-renders). Duplicate pending jobs for
    the same key collapse to one."""
    terminal = {_job_key(r) for r in records if r.get("status")}
    seen: set[str] = set()
    jobs: list[dict] = []
    for r in records:
        if r.get("status") or "artifact" not in r:
            continue
        key = _job_key(r)
        if key in terminal or key in seen:
            continue
        seen.add(key)
        jobs.append(r)
    return jobs


def _append_status(path: Path, job: dict, status: str, detail: str = "") -> None:
    rec = {
        "status": status,
        "artifact": job.get("artifact"),
        "sceneSpecHash": job.get("sceneSpecHash"),
        "at": datetime.now(UTC).isoformat(),
    }
    if detail:
        rec["detail"] = detail[:300]
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(rec, separators=(",", ":")) + "\n")


def _render(artifact: str) -> tuple[bool, str]:
    """Run the Remotion CLI for one artifact. Never raises — a failed render marks the job errored,
    the loop continues. Returns (ok, detail)."""
    cmd = [*shlex.split(RENDER_CMD), "--artifact", artifact]
    try:
        proc = subprocess.run(cmd, cwd=PKG_DIR, check=False, capture_output=True, text=True)
    except OSError as exc:  # node/bun missing, etc.
        return False, f"spawn failed: {exc}"
    if proc.returncode == 0:
        return True, ""
    return False, (proc.stderr or proc.stdout or f"exit {proc.returncode}").strip()


def drain_once(path: Path = QUEUE_PATH) -> int:
    """One pass: render every pending job, append a done/error status line for each. Returns the
    number of jobs processed."""
    jobs = pending_jobs(_read(path))
    for job in jobs:
        artifact = str(job.get("artifact") or "")
        print(f"[worker] rendering {artifact}", flush=True)
        ok, detail = _render(artifact)
        _append_status(path, job, "done" if ok else "error", detail)
        print(f"[worker] {'done' if ok else 'ERROR'} {artifact} {detail}".rstrip(), flush=True)
    return len(jobs)


def loop(interval: float) -> None:
    print(f"[worker] draining {QUEUE_PATH} every {interval}s (ctrl-c to stop)", flush=True)
    while True:
        drain_once()
        time.sleep(interval)


def _selftest() -> None:
    """Pure-logic check: pending_jobs skips done/errored specs, dedupes, ignores status lines."""
    recs = [
        {"artifact": "/a.json", "sceneSpecHash": "h1"},
        {"artifact": "/a.json", "sceneSpecHash": "h1"},  # duplicate pending -> one
        {"artifact": "/b.json", "sceneSpecHash": "h2"},
        {"status": "done", "artifact": "/b.json", "sceneSpecHash": "h2"},  # h2 terminal
        {"artifact": "/c.json"},  # no hash -> keyed by path
        {"status": "error", "artifact": "/c.json"},  # c terminal (error is terminal per spec)
    ]
    keys = [_job_key(j) for j in pending_jobs(recs)]
    assert keys == ["h1"], keys
    print("worker self-check ok")


def main(argv: list[str]) -> int:
    if "--selftest" in argv:
        _selftest()
        return 0
    if "--once" in argv:
        n = drain_once()
        print(f"[worker] processed {n} job(s)", flush=True)
        return 0
    interval = 15.0
    if "--interval" in argv:
        interval = float(argv[argv.index("--interval") + 1])
    loop(interval)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
