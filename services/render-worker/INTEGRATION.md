# Gateway integration seam — render on promotion to canonical

This package renders MP4s **out-of-band**. The gateway never renders (Remotion is Node-only and its
deps live only here). The seam is exactly one call, plus a worker that drains a queue file.

## The one hook

When a **video** artifact is promoted to canonical, enqueue a render. That promotion happens in
`services/gateway/src/classess_gateway/plexus/validate.py`, in `validate_and_promote(...)`, right
after the canonical record is written:

```python
store.save(concept, modality, difficulty, canonical, scope)   # validate.py ~L186 (existing)
# --- render seam (add this) ---
if modality == "video":
    from classess_render_worker.queue import enqueue_render   # or import by path; see note
    enqueue_render(store.artifact_path(concept, modality, difficulty, scope))
```

`store.artifact_path(concept, "video", difficulty, scope)` already returns the canonical JSON path
(`content/cache/video/<slug>--<difficulty>--<hash>.json`). That path is the whole job.

> Note: this package is intentionally **not** a Python package on the gateway's path. Wire it by
> adding `services/render-worker` to the gateway's `sys.path`, or copy `queue.py` next to the
> gateway, or (simplest) have the gateway append the same JSONL line itself — the format is
> `{"artifact": <path>, "out": null, "enqueuedAt": <iso>}`. The queue file is the contract, not the
> import.

Do not add Remotion or any render dependency to the gateway. The enqueue side is pure stdlib
(`queue.py`).

## The queue

`queue.py` is the whole queue: an append-only JSONL at
`content/cache/_render-queue.jsonl` (override with `RENDER_QUEUE_PATH`).

- `enqueue_render(artifact_path, out=None)` — appends one job. Safe to call on every promotion;
  the worker dedupes by scene-spec hash and reuses an existing MP4 (reuse economy), so a re-promote
  is nearly free.
- `drain()` — reads and clears the queue, returning pending jobs.

## The worker (drains the queue)

A tiny out-of-band loop (cron, a sidecar, or a `bun`/`node` process) does:

```python
from classess_render_worker.queue import drain
import subprocess
for job in drain():
    subprocess.run(["node", "src/render.ts", "--artifact", job["artifact"]],
                   cwd="services/render-worker", check=False)
```

Each render writes, **beside the artifact**:

- `<artifact-base>.<sceneSpecHash>.mp4` — the video (never overwritten; a changed spec ⇒ new hash ⇒
  new file — retention law: every version survives forever).
- `<artifact-base>.<sceneSpecHash>.render-manifest.json` — `{sceneSpecHash, model, renderedAt, fps,
  dims, durationInFrames, durationMs, outputSha256, …}`.

The app can then prefer the cached MP4 when one exists for the artifact's current scene-spec hash,
falling back to the live `MotionPlayer` otherwise. That app-side wiring is out of scope here (the
endgame mission owns `apps/web-pwa`); this package only produces the file + manifest and the seam.
