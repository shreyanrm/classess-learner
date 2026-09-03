# Gateway integration seam — render on promotion to canonical

This package renders MP4s **out-of-band**. The gateway never renders (Remotion is Node-only and its
deps live only here). The seam is exactly one call, plus a worker that drains a queue file.

## The one hook

When a **video** artifact is promoted to canonical, enqueue a render. That promotion happens in
`services/gateway/src/wobo_gateway/plexus/validate.py`, in `validate_and_promote(...)`.

**Implemented** (2026-07-07): the gateway appends the JSONL line **itself** (pure stdlib,
`_enqueue_video_render` / `_maybe_enqueue_render`) after each canonical video save, rather than
importing this package. The job carries a `sceneSpecHash` (a gateway-side content fingerprint) so
the append is **idempotent per film among pending jobs** and best-effort (a queue-write failure
never blocks the promotion). A seeded honest-floor video is not enqueued.

`store.artifact_path(concept, "video", difficulty, scope)` returns the canonical JSON path
(`content/cache/video/<slug>--<difficulty>--<hash>.json`). That path is the whole job.

> Note: this package is intentionally **not** a Python package on the gateway's path, and it
> deliberately ships no enqueue helper for the gateway to import. **The queue file is the
> contract, not an import** — the line format is
> `{"artifact": <path>, "out": null, "sceneSpecHash": <hash>, "enqueuedAt": <iso>}`.

Do not add Remotion or any render dependency to the gateway. The enqueue side is pure stdlib on
the gateway's own side of the seam.

## The queue

The queue is an append-only JSONL at `content/cache/_render-queue.jsonl` (override with
`RENDER_QUEUE_PATH`). **Append-only is the whole design.** There used to be a second, unused
`queue.py` here whose `drain()` read the file and then truncated it — which silently destroyed
every job appended between the read and the write, and contradicted the retention law the worker
actually follows. It was deleted; `worker.py` is the only reader.

- The producer (the gateway) appends one job line per canonical video save. Safe on every
  promotion: the worker dedupes by scene-spec hash and reuses an existing MP4 (reuse economy), so
  a re-promote is nearly free.
- The consumer (`worker.py`) reads the whole file, takes `pending_jobs(...)` — the specs with no
  later `done`/`error` status line — and **appends** its own status lines. It never rewrites or
  truncates the file, so a concurrent append can never be lost.

## The worker (drains the queue)

**Implemented**: `worker.py` (stdlib) is the drain loop — `python worker.py --once` (cron) or
`python worker.py` (sidecar). It renders each pending job and **appends** a `done`/`error` status
line to the same jsonl (append-only — retention law: a done spec is skipped next pass, nothing is
rewritten). See the README ("Draining the queue"). Conceptually it does:

```python
# worker.py: for each pending (un-drained, not-yet-done) job
subprocess.run(["node", "src/render.ts", "--artifact", job["artifact"]],
               cwd="services/render-worker", check=False)
# then append {"status": "done"|"error", "sceneSpecHash": ..., ...} to the queue file
```

Each render writes, **beside the artifact**:

- `<artifact-base>.<sceneSpecHash>.mp4` — the video (never overwritten; a changed spec ⇒ new hash ⇒
  new file — retention law: every version survives forever).
- `<artifact-base>.<sceneSpecHash>.render-manifest.json` — `{sceneSpecHash, model, renderedAt, fps,
  dims, durationInFrames, durationMs, outputSha256, …}`.

The app can then prefer the cached MP4 when one exists for the artifact's current scene-spec hash,
falling back to the live `MotionPlayer` otherwise. That app-side wiring is out of scope here (the
endgame mission owns `apps/web-pwa`); this package only produces the file + manifest and the seam.
