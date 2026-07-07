"""Render queue seam — the one function the gateway calls when it promotes a video artifact to
canonical. It does NOT render (Remotion is Node-only and lives in this package's own node_modules);
it appends a job the render worker drains out-of-band. See INTEGRATION.md for the exact hook.

ponytail: a JSONL file is the whole queue. It is durable, append-only, greppable, and needs no
broker. Swap for Redis/SQS behind `enqueue_render` if throughput ever matters — callers don't change.
"""

from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from pathlib import Path

# The queue lives beside the cached artifacts so the worker finds jobs and outputs in one tree.
QUEUE_PATH = Path(
    os.getenv("RENDER_QUEUE_PATH")
    or Path(__file__).resolve().parents[2] / "content" / "cache" / "_render-queue.jsonl"
)


def enqueue_render(artifact_path: str | Path, *, out: str | None = None) -> None:
    """Enqueue a canonical video artifact for MP4 rendering. Idempotent per (artifact, mtime):
    re-promoting the same file re-enqueues (the worker dedupes by scene-spec hash and reuses)."""
    path = Path(artifact_path)
    job = {
        "artifact": str(path),
        "out": out,
        "enqueuedAt": datetime.now(UTC).isoformat(),
    }
    QUEUE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with QUEUE_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(job, separators=(",", ":")) + "\n")


def drain() -> list[dict]:
    """Read and clear the queue, returning pending jobs. The worker loop calls this, then runs
    `node src/render.ts --artifact <job.artifact>` for each. Reuse economy makes re-runs cheap."""
    if not QUEUE_PATH.exists():
        return []
    jobs = [json.loads(line) for line in QUEUE_PATH.read_text(encoding="utf-8").splitlines() if line.strip()]
    QUEUE_PATH.write_text("", encoding="utf-8")
    return jobs


if __name__ == "__main__":  # tiny self-check: enqueue then drain round-trips one job
    import tempfile

    with tempfile.TemporaryDirectory() as d:
        QUEUE_PATH = Path(d) / "q.jsonl"  # type: ignore[assignment]
        enqueue_render("/tmp/a.json", out="/tmp/a.mp4")
        drained = drain()
        assert len(drained) == 1 and drained[0]["artifact"] == "/tmp/a.json", drained
        assert drain() == [], "queue must be empty after drain"
        print("queue.py self-check ok")
