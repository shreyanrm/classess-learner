# @classess/render-worker

Renders a cached **video scene-plan artifact** (from the `engine.video` pipeline) to an **MP4**,
beat-synced to the measured narration audio. Our explainers normally play **live** in the browser
(`apps/web-pwa/.../MotionPlayer.tsx`) as self-animating inline-SVG scenes; this worker produces a
downloadable/shareable MP4 of the exact same film for offline, social, or CDN use.

---

## ⚠️ LICENSE — Remotion requires a company licence

This package depends on **[Remotion](https://remotion.dev)**. Remotion is **free for individuals and
small teams, but a paid company licence is required for companies past a size/usage threshold**
(see <https://remotion.dev/license> and `remotion/LICENSE.md`). **Classess must hold a valid Remotion
company licence before this worker is run in production or as part of the business.** This is the
sole reason Remotion is quarantined in this package and nowhere else in the monorepo — do not add
`remotion`, `@remotion/*`, or any transitive render dep to the app or the gateway.

---

## Isolation — deliberately NOT a workspace member

This package is **not** listed in the root `workspaces` (`apps/*`, `packages/*`, `platform/*`). It
carries its own `node_modules` and its own lockfile. Rationale:

- Remotion's deps are heavy (a headless Chromium download, an ffmpeg-class compositor) and carry the
  licence obligation above — they must never hoist into the app's dependency graph. **The app gains
  no deps.**
- Root `bun install` / `bun run --filter '*' typecheck|test` stay untouched, so this package can't
  break the app's or gateway's gates.

Install and run it on its own:

```bash
cd services/render-worker
bun install                       # or: npm install — pulls Remotion + downloads headless Chromium
bun run typecheck                 # tsc --noEmit
bun run test                      # bun test (beat-sync plan smoke test)
```

To register it as a workspace later (only if Remotion's licence + hoisting are acceptable), add
`"services/render-worker"` to the root `workspaces` array.

## CLI

```bash
bun run render -- --artifact <path/to/artifact.json> [--out <path/to.mp4>] [--force]
# e.g.
bun run render -- --artifact ../../content/cache/video/refraction-of-light--core--8994385bde32.json \
                  --out /tmp/refraction.mp4
```

- `--artifact` — a cached scene-plan JSON (`{ artifact: { scenes: [{ visual:{kind,payload}, audio:{mime,b64,durationMs}, durationMs }] } }`).
- `--out` — optional extra copy of the MP4 (the canonical render is always written beside the artifact).
- `--force` — re-render even if a render for this scene-spec hash already exists.

`render` is wired to `node src/render.ts` (Node runs the `.ts` via type-stripping) — Node drives the
Remotion renderer for stability; `bun run render` invokes it either way.

## What it does (the laws it honours)

- **Beat-sync (MOTION.md §5):** each scene lasts **exactly its measured narration-audio duration**
  (`scene.audio.durationMs`), falling back to the authored `scene.durationMs` only when a scene has
  no audio. Never a fixed timer. This mirrors the app's `motionSceneFromVideo` bridge one-to-one.
- **No length cap (length law):** total duration is the sum of the beats — the final beat's
  narration is never cut.
- **Audio law:** the per-scene voiceover is mixed in; optional **per-beat sfx cues** (`scene.sfx:
  [{mime,b64,atMs}]`) and an optional **BGM bed** (`artifact.bgm:{mime,b64,gain}`) or a continuous
  artifact-level narration track (`artifact.narrationAudio`) are honoured **when present** in the
  plan — otherwise no-ops.
- **Reuse economy + retention (version-retention law):** the canonical render is written beside the
  artifact as `<base>.<sceneSpecHash>.mp4`. Same spec ⇒ same hash ⇒ the existing MP4 is reused. A
  changed spec ⇒ new hash ⇒ a new file. Renders are **never overwritten or deleted**; every version
  survives forever. A `<base>.<sceneSpecHash>.render-manifest.json` records
  `{sceneSpecHash, model, renderedAt, …}`.
- **SMIL correctness:** each scene's SMIL animation timeline is pinned to Remotion's frame clock
  (`svg.setCurrentTime(frame/fps)`), so a headless frame-seek reproduces the animation the browser
  plays live.

## Trust boundary

Input SVGs are the **already-sanitized** payloads the gateway wrote to the canonical cache
(`plexus/sanitize.py`); this worker renders them offline in a sandboxed headless Chromium to pixels
(no live session, cookies, or network exfil surface). Point it only at gateway-produced cache
artifacts. Do not feed it untrusted, unsanitized JSON.

## Layout

```
services/render-worker/
  package.json          # standalone; Remotion deps quarantined here
  tsconfig.json         # extends ../../tsconfig.base.json
  src/
    plan.ts             # pure: artifact JSON → beat-synced RenderPlan + scene-spec hash
    plan.test.ts        # bun-test smoke test (beat-sync law, hash, fallbacks, real artifact)
    Root.tsx            # Remotion entry: registers the "Explainer" composition
    Explainer.tsx       # the composition: one Sequence per beat, SMIL-pinned SVG + mixed audio
    render.ts           # CLI: build plan → decode audio → bundle → renderMedia → manifest
  queue.py              # stdlib render-queue seam the gateway calls (see INTEGRATION.md)
  INTEGRATION.md        # the one gateway hook (on promote-to-canonical → enqueue_render)
  public/               # generated: decoded audio assets Remotion serves (gitignored)
```

The gateway seam is **documented only** (`INTEGRATION.md`) — this package does not edit gateway
source.
