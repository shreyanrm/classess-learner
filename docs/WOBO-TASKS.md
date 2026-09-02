# Wobo — task list

Companion to `docs/WOBO-PLAN.md`. Every task is a checkbox; checked off with the commit that closed it. Waves 1 to 4 come from the 2026-09-02 audit (246 findings; the report is kept outside the repo); waves 5 to 9 are the product. Nothing starts on ambiguity between waves; each wave ends with all gates green, a commit, a push, screenshot proof, and an update to this file.

Legend: **owner** = only the owner can do it · **design** = Fable's own hand · **gate** = must pass before the wave closes.

## Wave 0 — Land and unblock

- [x] Rebrand Classess Learner and Vidya to Wobo across app, gateway, contracts, docs — `09a2bf4`
- [x] First-meeting introduction (owner copy), written in her hand and spoken once — `09a2bf4`
- [x] Brand assets: inline wordmark, favicon, PWA icons, video watermark — `09a2bf4`
- [x] Plan and task list committed
- [x] **owner** Restore Supabase project `keepraxqagzgjrrweryt` — restored 2026-09-02; hostname resolves; auth answers
- [x] Database follows the rebrand — migration `0006`: `last_seen_by_wobo_at`, thread default `wobo`, `profiles_cache.birthdate` / `interests` / `plan` — applied 2026-09-02
- [ ] Sync `birthdate` and `interests` to `profiles_cache` now that the columns exist (the onboarding keeps them local today) — folds into Wave 3
- [ ] **owner** Buy the Wobo domain; until then the default Vercel URL is the address; config stays brand-neutral
- [ ] **owner** Precautionary rotation of provider keys before launch (Anthropic, OpenAI, Google AI, Resend, Supabase service role, Railway)
- [ ] **owner** Real prices when ready; dummy values until then
- [ ] **owner** A launch date or event, if one exists

<!-- AUDIT-SECTION-START -->

<!-- Derived from audit-findings.json (246 verified findings). All paths and identifiers
     rewritten for the Wobo rebrand (src/vidya/ -> src/wobo/, packages/vidya -> packages/wobo,
     classess_gateway/vidya.py -> wobo.py, vidya.turn -> wobo.turn, VIDYA_SYSTEM -> WOBO_SYSTEM).
     Every location was verified to exist. Two corrections to the audit's own paths:
       - engines/BlockAssembly.tsx is actually engines/cs/BlockAssembly.tsx
       - wave14-shots/ does not exist (that finding is itself about the nonexistent path)
     Three locations are git-tracked but already deleted in the working tree by remediation
     running concurrently with this write: apps/web-pwa/vercel.json, render.yaml,
     services/gateway/fly.toml. -->

## Wave 1 — Lock the brain (security boundary)

37 tasks to fix · 0 superseded (rebuilt in later waves)

### Gateway auth, spend and rate limiting
- [ ] **Authenticate the gateway HTTP surface** — `services/gateway/src/classess_gateway/app.py:375` · critical · CONFIRMED — Verify a Supabase `Authorization: Bearer` JWT inside the existing `_guard_and_log` middleware over the spend-bearing path set it already computes, returning 401 before `call_next` while leaving `/healthz` open. (reported twice)
- [ ] **Stop accepting client-supplied `messages` in capability payloads** — `services/gateway/src/classess_gateway/providers.py:280` · critical · CONFIRMED — Delete the `messages` branch, build the prompt only from `payload["input"]` plus a gateway-owned system prompt, and add a per-capability `max_tokens` ceiling.
- [ ] **Derive consent tier server-side instead of trusting the client** — `services/gateway/src/classess_gateway/app.py:117` · critical · CONFIRMED — Drop `consent_tier` from `CapabilityRequest` and have `Gateway.invoke` evaluate `pol.allows(ConsentTier.UN_ELEVATED)`, gating elevated-only capabilities behind the internal shared key until a server-side consent record exists. (reported twice)
- [ ] **Key the rate limiter on the real client, not the platform proxy** — `services/gateway/src/classess_gateway/app.py:318` · high · CONFIRMED — Resolve the bucket key from the trusted forwarded chain (set `FORWARDED_ALLOW_IPS` behind the platform edge) instead of `request.client.host`, so every learner is not bucketed behind one proxy IP. (reported twice)
- [ ] **Prune the rate-limit map by expiry instead of clearing it** — `services/gateway/src/classess_gateway/app.py:326` · medium · UNVERIFIED — Replace the wholesale `hits.clear()` at the size cap with `{k: v for k, v in hits.items() if k[1] >= window}` so growing the map cannot reset every caller’s counter.
- [ ] **Drop the Vercel preview-origin CORS regex under `ENV=prod`** — `services/gateway/src/classess_gateway/app.py:292` · medium · UNVERIFIED — Pass `allow_origin_regex` only when `ENV` is not `prod`, so the production trust boundary is exactly the single origin `_cors_origins()` returns.
- [ ] **Key the generation queue on the authenticated subject** — `services/gateway/src/classess_gateway/plexus/engines.py:1958` · medium · UNVERIFIED — Derive the per-user slot key from the Supabase JWT subject rather than `payload["user"]`, keeping the per-IP limiter as the anonymous fallback.
- [ ] **Trim or gate the `/v1/capabilities` disclosure** — `services/gateway/src/classess_gateway/app.py:371` · low · UNVERIFIED — Put the route behind the same auth dependency as the capability invokes, or reduce `PolicyView` to capability name and `elevated_only` and drop provider_model, cost_ceiling and the fallback chain.

### LLM call bounds and resource limits
- [ ] **Put a timeout on every live LLM call and enforce the registry ceilings** — `services/gateway/src/classess_gateway/wobo.py:990` · high · CONFIRMED — Add a keyword-only `timeout_s` to the Provider protocol (defaulted so MockProvider and existing tests keep working) and thread the registry’s `max_latency_ms`/`cost_ceiling` through every live call.
- [ ] **Bound the gateway in-memory artifact cache** — `services/gateway/src/classess_gateway/cache.py:45` · high · CONFIRMED — Back `InMemoryCache._store` with an `OrderedDict`, `move_to_end` on hit and evict at a capacity ceiling, so base64 video narration is not retained for the life of the process.
- [ ] **Stop re-arming post-serve validation on every provisional cache hit** — `services/gateway/src/classess_gateway/plexus/engines.py:1952` · high · CONFIRMED — Track in-flight validations in a `_validating` set beside `_gen_lock` so a cached provisional artifact spawns one validation thread instead of one per request.
- [ ] **Bound the telemetry MetricsSink** — `services/gateway/src/classess_gateway/telemetry.py:26` · medium · UNVERIFIED — Make `MetricsSink.events` a `deque(maxlen=1000)` so dev/test inspection survives while production stops accumulating every event forever.

### Prompt injection and content trust
- [ ] **Bind cache keys to the full normalized concept to stop shared-cache poisoning** — `services/gateway/src/classess_gateway/plexus/engines.py:1738` · high · CONFIRMED — Compute the artifact digest from the full normalized concept rather than the truncated slug, so an unauthenticated caller cannot collide keys and seed content every child then reads.
- [ ] **Fence the client-supplied region of the Wobo prompt** — `services/gateway/src/classess_gateway/wobo.py:930` · medium · UNVERIFIED — Wrap the client-derived block in explicit delimiters in `_build_user_prompt`, add one line to `WOBO_SYSTEM` declaring that region data and never instructions, and strip newlines from the injected dossier/machine-room fields.
- [ ] **Treat remembered learner facts as data, not instructions** — `apps/web-pwa/src/store/mind.ts:93` · medium · UNVERIFIED — Emit dossier facts as a JSON array in `_dossier`, state in `WOBO_SYSTEM` that they are recorded details rather than instructions, and run the inbound safety classifier over `lifetime.facts`.
- [ ] **Screen every free-text field the prompt builder actually reads** — `services/gateway/src/classess_gateway/safety.py:147` · medium · UNVERIFIED — Make `inbound_text` walk the same keys `_build_user_prompt` consumes (canvas.equation, canvas.steps[], targets[].label, page.state, lifetime.facts[], turn.*) instead of enumerating two by hand.
- [ ] **Run inbound child-safety screening on every learner-facing capability** — `services/gateway/src/classess_gateway/app.py:198` · medium · UNVERIFIED — Move the screen out of the `capability == "wobo.turn"` special case to the top of `Gateway.invoke` for the learner-facing set, and run the outbound screen on their text output too.
- [ ] **Screen model-authored action text on the way out** — `services/gateway/src/classess_gateway/safety.py:173` · medium · UNVERIFIED — Have `screen_wobo_outbound` classify `say` plus every text field in `output["actions"]` and the viz caption, dropping the actions on a flag exactly as it already does.
- [ ] **Implement the image-generation moderation stub** — `services/gateway/src/classess_gateway/plexus/image.py:66` · medium · UNVERIFIED — Call `classess_gateway.safety.moderate(concept)` inside `_moderation_ok` and return False on any flagged verdict, instead of a one-line stub that always returns True.
- [ ] **Bring the server SVG sanitizer to parity with the client’s** — `services/gateway/src/classess_gateway/plexus/sanitize.py:40` · medium · UNVERIFIED — Add `set` to the removed-element pass, drop `animate*` elements whose `attributeName` contains href, and apply `_href_allowed` to `src`/`xlink:href` and to animation `to`/`values`/`from`.

### Voice relay and microphone
- [ ] **Gate `/v1/voice/tts/stream` with a session token and the concurrency cap** — `services/gateway/src/classess_gateway/voice.py:189` · high · CONFIRMED — Require `_consume_token(query_params["token"])` and the `_MAX_CONCURRENT_RELAYS` check before accept, and have `speakStream` fetch `/v1/voice/session` and append `?token=` the way `voice.ts` already does. (reported twice)
- [ ] **Validate relay frames before forwarding them to Gemini Live** — `services/gateway/src/classess_gateway/voice.py:74` · high · CONFIRMED — In `pump_up`, parse each inbound frame and forward only dicts whose keys are a subset of `{realtimeInput, clientContent, toolResponse}`, dropping anything carrying a `setup` key.
- [ ] **Close the mic when push-to-talk is released before the session connects** — `apps/web-pwa/src/wobo/Companion.tsx:226` · high · CONFIRMED — Add an epoch ref in `voice.ts` and tear the stream down when the epoch moves, so releasing the orb mid-connect stops the track instead of leaving it streaming indefinitely.
- [ ] **Cap voice relay concurrency per subject rather than globally** — `services/gateway/src/classess_gateway/voice.py:53` · medium · UNVERIFIED — Replace the single global counter with a per-subject dict plus a much higher instance-wide ceiling, so four anonymous sockets cannot take the voice offline for every learner.

### Code execution sandboxes
- [ ] **Kill the SymPy eval namespace in the CAS verifier** — `services/verifier/src/classess_verifier/cas.py:41` · critical · CONFIRMED — Build `_NS` from sympy’s public names with `__builtins__ = {}` and pass `global_dict=_NS` to `parse_expr`, rather than relying on a character allowlist that is bypassable via `eval(chr(..))`. (reported twice)
- [ ] **Isolate Pyodide from the page origin** — `apps/web-pwa/src/engines/cs/pyodide.ts:143` · medium · UNVERIFIED — Run Pyodide in a Web Worker (or at minimum pass `jsglobals: new Map()` and strip the `js`/`pyodide_js` modules) so executed Python has no DOM, cookies, localStorage or same-origin fetch. (reported twice)

### Path handling and output injection
- [ ] **Sanitize `difficulty` before it reaches the cache filename** — `services/gateway/src/classess_gateway/plexus/store.py:122` · high · CONFIRMED — Slug `difficulty` inside `artifact_path` before computing the body/digest so every caller is covered and client input can no longer traverse to an arbitrary file write.
- [ ] **Validate and sanitize RDKit SVG before `dangerouslySetInnerHTML`** — `apps/web-pwa/src/engines/ChemScene.tsx:1081` · medium · UNVERIFIED — Port the gateway’s `valid_smiles` charset/length check into `parseChemScene` and adopt only the parsed `<svg>` root from `DOMParser` instead of injecting the renderer’s raw string.
- [ ] **Escape and scheme-check CTA URLs in email templates** — `services/gateway/src/classess_gateway/email_templates.py:61` · medium · UNVERIFIED — Escape `url` in `_button` after rejecting anything that is not `https://`, and apply the same to the raw link/cta_url uses in the plain-text bodies.
- [ ] **Restrict `/v1/email/send` recipients and CTA hosts** — `services/gateway/src/classess_gateway/email.py:108` · medium · UNVERIFIED — Allowlist the CTA host at the `_button` choke point and restrict `to` to addresses associated with the subject the email is about, so the internal key stops being a phishing primitive.
- [ ] **Drop `<style>` elements from generated SVG entirely** — `apps/web-pwa/src/engines/DiagramView.tsx:42` · low · UNVERIFIED — Remove every `<style>` element in `sanitizeSvgElement` instead of blocklisting the `url(` token, which currently lets `@import` through.
- [ ] **Encode PostgREST filter values** — `packages/sdk/src/state.ts:339` · low · UNVERIFIED — Have `SupabaseRest.selectOne` take structured filters run through `URLSearchParams` instead of a pre-built query string, so every caller is encoded where the URL is assembled.

### Learner privacy (minor data)
- [ ] **Scope the tutor transcript archive per account and clear it on sign-out** — `apps/web-pwa/src/wobo/chat.tsx:43` · high · CONFIRMED — Add a module-level archive scope in `chat.tsx` and key `clss-wobo-archive-v1` by subject id via an `archiveKey()` helper used by `readArchive`/`writeArchive`, matching the scoping the SDK already applies.
- [ ] **Add a server-side erasure path for a minor’s data** — `apps/web-pwa/src/screens/You.tsx:921` · medium · UNVERIFIED — Add a `delete(table, query)` verb to `SupabaseRest` and have `startOver` (plus a dedicated delete-my-data control) issue DELETEs against `learner_state`, `learner_threads` and `profiles_cache` for the current subject before clearing localStorage.
- [ ] **Stop logging recipient email addresses** — `services/gateway/src/classess_gateway/email.py:50` · low · UNVERIFIED — Log a `to_hash` (sha256 prefix) instead of the address in all four `send_email` log calls.
- [ ] **Stop retaining raw client IPs for minors** — `services/gateway/src/classess_gateway/app.py:347` · low · UNVERIFIED — Log a salted `blake2b` hash of the IP at the single emission point instead of the address itself.
- [ ] **Stop putting the child’s real name in invite links** — `apps/web-pwa/src/screens/You.tsx:823` · low · UNVERIFIED — Use the opaque subject id or a short random referral code as the `via` parameter so the minor’s name stops travelling in shared URLs.

## Wave 2 — Production config, deploy truth, CI

29 tasks to fix · 0 superseded (rebuilt in later waves)

### CSP and web deploy config
- [ ] **Fix the production CSP so the engines actually run** — `vercel.json:19` · high · CONFIRMED — In the root `vercel.json` CSP add `'wasm-unsafe-eval'` and `https://cdn.jsdelivr.net` to `script-src` (and jsdelivr to `connect-src`) and `data:` to `media-src`, which unblocks RDKit, Pyodide and every generated video/narration clip in production. (reported five times)
- [ ] **Collapse the two conflicting `vercel.json` files to one** — `apps/web-pwa/vercel.json:1` · medium · CONFIRMED — Delete `apps/web-pwa/vercel.json` and keep the root file as the single deploy contract, since only one is ever read and only the root one carries the security headers. (reported three times)
- [ ] **Exclude `.env*` from the Railway and Vercel upload contexts** — `.railwayignore:1` · medium · UNVERIFIED — Add `.env*` with a `!.env.example` negation to `.railwayignore` and `.vercelignore`, mirroring `.dockerignore` — on Vercel an uploaded `.env.local` is inlined into the public bundle by Vite.
- [ ] **Ship theme-aware `theme-color` meta tags** — `apps/web-pwa/index.html:6` · low · UNVERIFIED — Emit media-scoped light/dark `theme-color` tags matching `chrome.page` and `--clss-page`, and update them from `paint()` when the learner picks an explicit theme.

### Environment and secrets
- [ ] **Close the production fail-open on dev auth and persist mode** — `DEPLOY.md:7` · high · CONFIRMED — `apps/web-pwa/.env.production` is gitignored though DEPLOY.md calls it committed — default `DEV_AUTH` to `import.meta.env.DEV` and `PERSIST_MODE` to `live` outside dev so a missing file cannot fall back to dev-mock auth.
- [ ] **Rewrite `.env.example` from the variables the code actually reads** — `.env.example:5` · medium · UNVERIFIED — Drop the twelve unread vars, add the nine gateway vars that are read but undocumented, and add a first-class `VITE_*` section for the six the web app requires. (reported twice)
- [ ] **Fix the `.gitignore` ordering that defeats `!.env.example`** — `.gitignore:53` · medium · UNVERIFIED — Delete the appended `.env*` line that overrides the negation — lines 2-3 already cover every secret file, so the negation then works as written.
- [ ] **Commit the real Vercel env procedure and reference it from DEPLOY.md** — `scripts/set-vercel-env.sh:9` · medium · UNVERIFIED — Commit `scripts/set-vercel-env.sh` with the anon key read from an argument or `vercel env pull` rather than hardcoded, add `VITE_GATEWAY_URL` to the set it writes, and link it from DEPLOY.md §1.

### Deploy targets and the gateway image
- [ ] **Reconcile DEPLOY.md with the live Railway deploy** — `DEPLOY.md:67` · medium · CONFIRMED — Add a `railway.json` pinning the live build (builder, dockerfile, start command, healthcheck) and document the real `ENV=prod`/`LLM_MODE=live` values, so the host that actually serves traffic has config in the repo.
- [ ] **Ship `content/catalogs` and `content/factbase` in the gateway image** — `services/gateway/Dockerfile:12` · medium · CONFIRMED — Drop `content/catalogs` from `.dockerignore`/`.railwayignore` (keeping `content/cache` excluded) and COPY both into the image, so the correctness fact-check gate stops silently no-opping in production.
- [ ] **Declare `aiohttp` as a gateway dependency** — `services/gateway/pyproject.toml:6` · medium · UNVERIFIED — Add `aiohttp>=3.9` to `services/gateway/pyproject.toml` dependencies so the live voice path’s import is pinned deliberately rather than by accident.
- [ ] **Retire or mark the stale `fly.toml` manifest** — `services/gateway/fly.toml:17` · low · UNVERIFIED — Keep exactly one manifest for the host actually in use and delete or explicitly mark this one inactive; it currently pins `LLM_MODE=mock` while prod runs live.
- [ ] **Retire or mark the stale `render.yaml` blueprint** — `render.yaml:2` · low · UNVERIFIED — Keep one blueprint for the host actually in use and move the alternatives under a clearly marked docs path, so exactly one file describes where the gateway runs.

### CI and test wiring
- [ ] **Give `apps/web-pwa` a `test` script so its unit tests run** — `apps/web-pwa/package.json:11` · high · CONFIRMED — Add `"test": "bun test .test.ts"` to `apps/web-pwa/package.json` — the path filter matters, since a bare `bun test` also collects the Playwright `*.spec.ts` suites and breaks CI. (reported three times)
- [ ] **Fix the E2E profile-button locator that can never match** — `apps/web-pwa/tests/journey.spec.ts:183` · high · CONFIRMED — Add a shared `profileButton(page)` helper to `apps/web-pwa/tests/helpers.ts` matching the rendered accessible name, and use it from both specs.
- [ ] **Make CI cover the active branch, the build and the E2E suite** — `.github/workflows/ci.yml:5` · medium · UNVERIFIED — Change the push trigger to all branches (or add `the-life`), add `bun run build`, and add a Playwright step that installs chromium and runs the committed e2e suite. (reported twice)
- [ ] **Rewrite the onboarding E2E test against the shipped flow** — `apps/web-pwa/tests/journey.spec.ts:33` · medium · CONFIRMED — Rewrite journey.spec.ts test 1 against the beats that actually ship, and do not copy `test/x-browser.spec.ts`, which asserts a deleted `getByLabel('your name')` field.
- [ ] **Include test sources in the web-pwa typecheck** — `apps/web-pwa/tsconfig.json:9` · medium · UNVERIFIED — Add `tests`/`test` to `include`, drop the `src/**/*.test.ts` exclude, and add `@playwright/test` to `compilerOptions.types` so the one command CI runs covers the test sources.
- [ ] **Give the cross-browser Playwright suite a runnable script and a gitignored output path** — `apps/web-pwa/test/x-browser.config.ts:14` · medium · UNVERIFIED — Add `"test:xbrowser": "playwright test -c test/x-browser.config.ts"` to `apps/web-pwa/package.json` and point `SHOT_ROOT` at a gitignored directory instead of committing 84 MB of output. (reported twice)
- [ ] **Run the render-worker test suite from CI** — `services/render-worker/package.json:9` · medium · UNVERIFIED — Add a CI step (or root script) that runs `bun test` inside `services/render-worker`; the package already has its own node_modules and only needs to be invoked.
- [ ] **Bring `services/render-worker` into the workspace, lint and test paths** — `pyproject.toml:20` · medium · UNVERIFIED — Add `services/render-worker` to the root `package.json` workspaces (and the ruff/pyproject paths) so its seven source files stop having zero CI coverage.
- [ ] **Add tests for the streaming voice endpoint and its token/concurrency gate** — `services/gateway/tests/test_gateway.py:301` · medium · UNVERIFIED — Add `tests/test_voice.py` covering mint/consume/expiry directly plus the two websocket gates via `TestClient.websocket_connect`, asserting a 1008 close with no token and once the relay cap is saturated.
- [ ] **Pin the safety-screen boundary for the non-`wobo.turn` model paths** — `services/gateway/tests/test_safety.py:92` · medium · UNVERIFIED — Add a `test_safety.py` case invoking `tutor.turn` with the crisis text that asserts the intended behaviour explicitly, so the boundary is stated rather than assumed.
- [ ] **Add the contracts-bundle drift test the codegen already claims** — `packages/contracts/codegen/emit-schemas.ts:9` · medium · UNVERIFIED — Add a drift test in `packages/contracts/test/` modelled on `plexus.codegen.test.ts` that rebuilds the bundle and asserts it string-equals both committed files.

### Contracts, codegen and lint config
- [ ] **Add the seven missing activity fields to the generated card contract** — `services/gateway/src/classess_gateway/plexus/specs.py:136` · medium · UNVERIFIED — Add the seven `dict[str, Any] | None` fields to `Card` in `specs.py` and regenerate, and either set `extra="forbid"` on `Spec` or delete the claim from its docstring.
- [ ] **Make ISO-timestamp validation survive the TS → JSON Schema crossing** — `packages/contracts/src/primitives.ts:17` · medium · UNVERIFIED — Replace the `.refine()` in `primitives.ts` with `z.string().regex(ISO_8601_RE)` so `z.toJSONSchema` emits the pattern and the Python mirror enforces the same rule.
- [ ] **Fix the unknown `preset` key in the Biome lint config** — `biome.json:29` · medium · UNVERIFIED — Change the rules key to `"recommended": true` and verify with `bunx biome check --diagnostic-level=info .` that no configuration diagnostic is emitted.
- [ ] **Correct the JSON Schema dialect in the emitted contract bundle** — `packages/contracts/codegen/emit-schemas.ts:21` · low · UNVERIFIED — Change the top-level literal to `https://json-schema.org/draft/2020-12/schema` so the bundle header matches what Zod actually emits, and regenerate both bundles.
- [ ] **Delete the drifted Wobo model constants and use the resolved policy** — `services/gateway/src/classess_gateway/wobo.py:39` · low · UNVERIFIED — Remove `WOBO_PRIMARY`/`WOBO_ESCALATE` and the `startswith("classess/")` branch, always using the `provider_model` and fallbacks the registry resolved.

## Wave 3 — Main-flow bugs and data scoping

26 tasks to fix · 36 superseded (rebuilt in later waves)

### Shell, router and app state
- [ ] **Stop the forge build runner cancelling itself in its own effect cleanup** — `apps/web-pwa/src/store/DownloadCenter.tsx:125` · high · CONFIRMED — Delete the cleanup (and the now-unused `timer` binding) so the effect owns `forgeRunning.current` for the life of the async work, matching the course runner above it — otherwise any forge-store mutation inside the 1600 ms window strands every workbook at "building".
- [ ] **Wire the router to the History API** — `apps/web-pwa/src/shell/router.tsx:45` · high · CONFIRMED — Add `routeToPath`/`pathToRoute` next to the Route union and drive `RouterProvider` from `history.pushState`/`popstate`, leaving all 48 call sites untouched, so the Android back button works and routes become addressable.
- [ ] **Mint chat turn ids independently of archive length** — `apps/web-pwa/src/App.tsx:283` · medium · UNVERIFIED — Use `crypto.randomUUID()` at the single mint site so ids stop colliding once the archive hits its 2000-turn cap.
- [ ] **Move persistence out of the `setState` updater in the progress store** — `apps/web-pwa/src/store/progress.tsx:327` · medium · UNVERIFIED — Keep the updater pure and move `persist`/`sdk.state.save` into a `useEffect` keyed on state — one effect covers all five call sites.
- [ ] **Confirm before `forget` wipes the whole memory** — `apps/web-pwa/src/App.tsx:424` · medium · UNVERIFIED — Render a client-side confirm affordance in the thread on `scope === "all"` and only call `clearMind()` after it is accepted.

### Account scoping and persistence
- [ ] **Scope the local-mode state cache per account** — `packages/sdk/src/client.ts:139` · high · CONFIRMED — Pass the signed-in subject id into `LocalStateProvider` so a second learner on the same device cannot read the first’s progress and tutor transcript.
- [ ] **Re-arm the outbox timer after a failed flush** — `packages/sdk/src/events.ts:132` · medium · UNVERIFIED — In the catch branch re-queue and re-arm the backoff timer, so a failed batch is retried instead of dying with the tab.
- [ ] **Persist streak-freeze budget and pending broken streak** — `packages/sdk/src/state.ts:259` · low · UNVERIFIED — Add `streak_freezes` and `broken_streak` columns in a migration and include them in `stateToRow`/`stateFromRow`, or move the freeze allowance somewhere that does sync.
- [ ] **Mint transcript turn ids with `crypto.randomUUID()`** — `apps/web-pwa/src/wobo/Companion.tsx:99` · low · UNVERIFIED — Use the same UUID mint the `turn_id` two blocks down already uses, removing the dependence on archive length.
- [ ] **Handle the floating consume promise in `record()`** — `packages/sdk/src/events.ts:64` · low · UNVERIFIED — Attach at least a `.catch(() => {})` (better, a recorded diagnostic) at the single call site so a consumer rejection is not an unhandled rejection.

### Wobo tutor, speech and context bus
- [ ] **Fire each `afterSentence` beat exactly once per performance** — `apps/web-pwa/src/wobo/speech.tsx:421` · high · CONFIRMED — Track fired beats in a `Set` keyed `s${i}`/`e${i}` in `performTurn` and flush only the remainder, so ink, say lines and setState stop duplicating after the performance completes.
- [ ] **Guarantee `onDone` fires once even when a line is muted or superseded** — `apps/web-pwa/src/wobo/speech.tsx:549` · high · CONFIRMED — Wrap the completion in a `done` flag with a single `finish()` in `speakLine`, so a muted or superseded line cannot permanently lock the course advance button.
- [ ] **Fix the sentence splitter’s handling of decimals and abbreviations** — `apps/web-pwa/src/wobo/speech.tsx:114` · medium · UNVERIFIED — Tighten `sentences()` so a period only ends a segment before whitespace and a capital/end-of-string and never between digits, keeping voice-anchored ink beats in sync.
- [ ] **Reset the redrawable mark set at the start of each turn** — `packages/wobo/src/context-bus.tsx:467` · medium · UNVERIFIED — Add `beginTurn()` to the bus and call it once in `performTurn`, so `addBeat` stops growing `lastMarksRef` without bound across a session.
- [ ] **Normalise fill-in-the-blank answer comparison** — `apps/web-pwa/src/wobo/paths/cards.tsx:94` · medium · UNVERIFIED — Trim, lowercase and collapse whitespace on both sides at the single comparison point instead of comparing case-sensitively.
- [ ] **Give the published canvas slot an owner** — `packages/wobo/src/context-bus.tsx:257` · medium · UNVERIFIED — Change `publishCanvas` to take an owner key so the ~20 copy-pasted `publishCanvas(undefined)` unmount hooks stop clearing another screen’s slot.

### Dark-theme regressions
- [ ] **Emit theme-aware colours from the generated-visualization fallback** — `apps/web-pwa/src/wobo/paths/classify.ts:341` · medium · UNVERIFIED — Emit `currentColor` and `var(--clss-paper)` in `seedVizSvg` and set `color: var(--clss-ink-900)` on the `SafeSvg` host, so the compose-a-visualization path is visible in dark theme.

### Gateway and plexus main-flow bugs
- [ ] **Write cache records atomically** — `services/gateway/src/classess_gateway/plexus/store.py:144` · medium · CONFIRMED — Write to a same-directory temp file with a pinned encoding and `os.replace` it, so a background render thread cannot interleave with a partial write.
- [ ] **Emit telemetry under the key the log formatter reads** — `services/gateway/src/classess_gateway/telemetry.py:38` · medium · UNVERIFIED — Change `telemetry.emit` to `extra={"fields": asdict(event)}` — one line at the only place telemetry is logged.
- [ ] **Fall back to the raw model text instead of a canned line** — `services/gateway/src/classess_gateway/wobo.py:1001` · medium · UNVERIFIED — When `_extract_json` yields `{}` and the text is non-empty, use the stripped text as `say` rather than discarding the reply.
- [ ] **Make the SMILES branch stack local to `valid_smiles`** — `services/gateway/src/classess_gateway/plexus/chem.py:258` · medium · UNVERIFIED — Delete the module-global stack and `valid_smiles_reset`, so the only production caller cannot be poisoned by a previous parse.
- [ ] **Refuse map scenes with tied extreme values server-side** — `services/gateway/src/classess_gateway/plexus/maps.py:129` · medium · UNVERIFIED — Compute the extreme per `it["extreme"]` and refuse when more than one entry attains it, so the derived answer is unambiguous.
- [ ] **Drain the relay outbox or delete the seam** — `platform/kgtopg-contract-seed/src/relay.ts:33` · medium · UNVERIFIED — Build the service-role publisher that reads `learner.outbox` where `published_at is null` and calls `runRelayOnce`, or remove the unreachable relay, since no event currently reaches `platform.events`.
- [ ] **Substitute the unsubscribe link and postal address in transactional email** — `services/gateway/src/classess_gateway/email_templates.py:196` · low · UNVERIFIED — Take an `unsubscribe_url` parameter on `_shell` alongside `cta_url` and have `render()` supply a real per-recipient link, replacing the bracketed placeholders.
- [ ] **Compare the internal key as bytes** — `services/gateway/src/classess_gateway/email.py:114` · low · UNVERIFIED — Use `secrets.compare_digest(provided.encode("utf-8", "ignore"), expected.encode())` so a non-ASCII header returns 403 instead of raising TypeError.
- [ ] **Make the cache re-key migration idempotent** — `content/cache/_migrations/aliases.jsonl:1` · low · UNVERIFIED — Read the existing alias log into a set of `from` names once and skip files already recorded, so re-runs stop appending duplicate rows.

<details><summary>Superseded in this wave (36)</summary>

- [ ] ~~**Scope course position, banked stars, thread-seen and daily-quest keys per account**~~ — `apps/web-pwa/src/screens/course/shared.tsx:31` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Scope and shard the Flashcards FSRS schedule key**~~ — `apps/web-pwa/src/engines/Flashcards.tsx:75` · low — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Rebuild the frame when class or board changes in You**~~ — `apps/web-pwa/src/screens/You.tsx:741` · high — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Key Home stops and Practice sandboxes off the frame’s own doors**~~ — `apps/web-pwa/src/screens/Practice.tsx:291` · high — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Await the frame build before navigating home on cross-device restore**~~ — `apps/web-pwa/src/screens/Onboarding.tsx:274` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Read the learner’s stored avatar choice on the expedition**~~ — `apps/web-pwa/src/screens/AdventureRoadmap.tsx:488` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Derive the Practice due-count and target from FSRS**~~ — `apps/web-pwa/src/screens/Practice.tsx:287` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Write the onboarded marker when the profile is persisted**~~ — `apps/web-pwa/src/screens/FrameBuilding.tsx:286` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Route the twin’s fallback study door to a real subject**~~ — `apps/web-pwa/src/screens/ProgressScreen.tsx:209` · low — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Stop the earned-burst and day-sealed banner freezing on screen**~~ — `apps/web-pwa/src/screens/home/Thread.tsx:726` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Use a local date key for the daily quest reset**~~ — `apps/web-pwa/src/screens/home/stops.ts:37` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Carry the boss score through to the performance stars**~~ — `apps/web-pwa/src/screens/course/Composing.tsx:1218` · high — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Ignore Enter on an empty practice entry**~~ — `apps/web-pwa/src/screens/course/PracticeRun.tsx:456` · high — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Randomise the correct option’s position in the boss missing-step card**~~ — `apps/web-pwa/src/screens/course/Boss.tsx:56` · high — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Let a generated course resume into the boss**~~ — `apps/web-pwa/src/screens/course/Composing.tsx:1191` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Hoist the balancer’s inline `Side` component to module scope**~~ — `apps/web-pwa/src/engines/ChemScene.tsx:463` · high — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Attach the scene-target refs the seven engines register**~~ — `apps/web-pwa/src/engines/MiniWorkbook.tsx:714` · high — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Grade the MiniWorkbook answers being revealed, not the stale ones**~~ — `apps/web-pwa/src/engines/MiniWorkbook.tsx:691` · high — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Refuse titration specs that would need thousands of taps**~~ — `apps/web-pwa/src/engines/ChemScene.tsx:690` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Refuse choropleth specs with tied extreme values**~~ — `apps/web-pwa/src/engines/MapScene.tsx:225` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Keep the ArcadeShell state updater pure**~~ — `apps/web-pwa/src/engines/ArcadeShell.tsx:259` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Cancel the ArcadeShell round-advance timeout on restart and unmount**~~ — `apps/web-pwa/src/engines/ArcadeShell.tsx:203` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Stop the BlockAssembly walk when the program is edited**~~ — `apps/web-pwa/src/engines/cs/BlockAssembly.tsx:286` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Never start a second PodcastPlayer reading-clock loop**~~ — `apps/web-pwa/src/engines/PodcastPlayer.tsx:229` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Prevent orphaned narration audio nodes overlapping**~~ — `apps/web-pwa/src/engines/PodcastPlayer.tsx:216` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Move Discovery’s side effects out of the state updater**~~ — `apps/web-pwa/src/engines/Discovery.tsx:399` · low — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Stop SimRunner collapsing fractional parameter ranges**~~ — `apps/web-pwa/src/engines/SimRunner.tsx:200` · low — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Charge one life per ArcadeShell mistake**~~ — `apps/web-pwa/src/engines/ArcadeShell.tsx:262` · low — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Restore the global cursor when AnatomyCanvas unmounts**~~ — `apps/web-pwa/src/engines/AnatomyCanvas.tsx:45` · low — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Stop the app header rendering as a white bar in dark mode**~~ — `apps/web-pwa/src/ui/AppHeader.tsx:476` · high — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Token the course what-if plates that hardcode white**~~ — `apps/web-pwa/src/screens/course/WhatIf.tsx:235` · high — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Replace `fill="#FFFFFF"` on ink-outlined shapes with `var(--clss-paper)`**~~ — `apps/web-pwa/src/screens/Learn.tsx:147` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Put the command palette above the fixed header**~~ — `apps/web-pwa/src/ui/AppHeader.tsx:474` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Select the newest rendered manifest, not the lexicographically last**~~ — `services/gateway/src/classess_gateway/plexus/engines.py:1834` · high — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Add the missing school units to the dimension table**~~ — `services/gateway/src/classess_gateway/plexus/dimensions.py:44` · low — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Attach only the first valid activity field to a composed card**~~ — `services/gateway/src/classess_gateway/plexus/engines.py:700` · low — superseded: rebuilt in Wave 5 (board/engines)

</details>

## Wave 4 — Repo cleanup and test wiring

27 tasks to fix · 0 superseded (rebuilt in later waves)

### Dead code — app and packages
- [ ] **Delete the dead `packages/ui` component system** — `packages/ui/src/index.ts:1` · medium · CONFIRMED — Port the surviving assertions from `packages/ui/test/ui.test.ts` first, then delete the package and drop it from `apps/web-pwa`’s dependencies — all 16 components have zero import sites and have diverged from the live kit. (reported twice)
- [ ] **Delete the second, unused Wobo presence implementation** — `packages/wobo/src/WoboPresence.tsx:1` · medium · UNVERIFIED — Remove `WoboPresence.tsx`, `WoboPanel.tsx` and `wobo-layer.tsx` plus their three export lines, leaving actions/context-bus/highlight-overlay as the live surface.
- [ ] **Get the Concept A/B/C prototypes out of the production bundle and palette** — `apps/web-pwa/src/screens/concepts/ConceptA.tsx:415` · medium · UNVERIFIED — Delete (or `import.meta.env.DEV`-gate) the three command-palette entries and lazy-load or remove the prototype routes, so screens full of fabricated learner data are neither reachable nor statically bundled. (reported three times)
- [ ] **Delete the unreachable `engine.image` seam** — `apps/web-pwa/src/engines/GeneratedImage.tsx:34` · medium · UNVERIFIED — Remove `ENGINE`/`register()` from `plexus/image.py` and the orphan `GeneratedImage.tsx` renderer, since there is no registry entry and no caller.
- [ ] **Consume or delete `useFidelity`** — `apps/web-pwa/src/shell/resilience.ts:96` · medium · UNVERIFIED — Gate the first-visit swoop and the full-arrival Wobo branch on `useFidelity()`, or delete the export — the documented low-fidelity degradation is currently never applied.
- [ ] **Delete the three dead scene-envelope unwrap paths** — `apps/web-pwa/src/engines/ChemScene.tsx:258` · low · UNVERIFIED — Remove the `raw.artifact`/`raw.spec` unwraps and the `verified === false` check from all seven parsers; the `card` field is the spec.
- [ ] **Delete `shell/shell-context.tsx`** — `apps/web-pwa/src/shell/shell-context.tsx:14` · low · UNVERIFIED — Nothing imports it and the `AppShell` it references does not exist.
- [ ] **Delete the unreferenced `public/wobo-logo.png`** — `apps/web-pwa/src/ui/Logo.tsx:12` · low · UNVERIFIED — Post-rebrand this finding is partly stale — `WoboLogo` and `public/favicon.svg` are both live now (AppHeader, MotionPlayer, concepts, index.html), so only the unreferenced PNG should go.
- [ ] **Delete the unread `Board.seeded` flag** — `apps/web-pwa/src/data/catalog.ts:20` · low · UNVERIFIED — Remove the field from `data/model.ts` and all thirteen catalog entries; it is never read and already contradicts the code that decides seeding.
- [ ] **Drop the `export` keyword from ~77 module-local symbols** — `apps/web-pwa/src/data/catalog.ts:848` · low · UNVERIFIED — Un-export the mind.ts, resilience.ts, catalog.ts and forge-store.ts clusters, leaving only what other files actually import.

### Dead code — services and content
- [ ] **Wire or remove the 663-line email subsystem** — `services/gateway/src/classess_gateway/email.py:107` · medium · UNVERIFIED — Either wire the callers and add `INTERNAL_EMAIL_KEY` to the deploy config, or drop `register_email` from `create_app` until there is a caller.
- [ ] **Wire or delete the `engine.image` / raster seam** — `services/gateway/src/classess_gateway/plexus/engines.py:1592` · medium · UNVERIFIED — Either have the composing screen request `engine.diagram` with `raster: true` for cards carrying an imageSpec, or delete the seam — nothing ever requests it today.
- [ ] **Call the Python contract mirror or drop the dependency** — `services/contracts/src/classess_contracts/__init__.py:3` · medium · UNVERIFIED — Invoke `classess_contracts.validate_event` at the server-side ingest point, or remove `classess_contracts` from the gateway dependencies, since no gateway module imports it.
- [ ] **Delete `services/render-worker/queue.py`** — `services/render-worker/queue.py:43` · medium · UNVERIFIED — `worker.pending_jobs` + `_append_status` are the real queue; the dead module’s `drain()` truncates the file and destroys jobs appended during the read. (reported twice)
- [ ] **Call or delete the Manim escalation rung** — `services/gateway/src/classess_gateway/plexus/manim_rung.py:55` · low · UNVERIFIED — Either call `needs_manim` inside `_generate_video_live` and enqueue beside `_maybe_enqueue_render`, or soften the README claim — no production path reaches it.
- [ ] **Wire or archive the `content/atom` spike** — `content/atom/spike-report.json:1` · low · UNVERIFIED — Either wire the grounded grader (the only code pairing the CAS verifier with a hint-safety guardrail) into the gateway, or archive the completed spike and its committed report.
- [ ] **Delete or relocate the four unreferenced `content/catalogs` JSON files** — `content/catalogs/reference-structures.json:1` · low · UNVERIFIED — Roughly 460 KB with no code reference — delete them, or move them beside the existing provenance notes if they are deliberate inputs.

### Tracked artifacts that should not be in the repo
- [ ] **Untrack the generated `content/cache/video` blobs** — `content/cache/video/:0` · high · OBSERVED — Confirm the cache is regenerable, add `content/cache/` to `.gitignore`, `git rm -r --cached` it and include it in the history rewrite.
- [ ] **Untrack `xbrowser/`, `respdiag/` and `shots/`** — `xbrowser/:0` · high · OBSERVED — Add all three to `.gitignore`, `git rm -r --cached` them and purge the paths from history — roughly 106 MB of duplicated QA screenshots.
- [ ] **Untrack the ~200 root-level screenshots and videos** — `wave14-audit-home-desktop-light.png:1` · high · OBSERVED — `git rm --cached` the root images and the three MP4s, add root screenshot/video patterns to `.gitignore`, and relocate anything worth keeping into `docs/` with provenance. (reported twice)
- [ ] **Make `.gitignore` actually cover the on-disk junk** — `.gitignore:43` · medium · OBSERVED — Add `.playwright-mcp/`, `xbrowser/`, `respdiag/`, `shots/`, `content/cache/` and a root screenshot/video glob, with a negation for the real PWA assets under `apps/web-pwa/public/`. (reported three times)
- [ ] **Remove the six one-off `*.workflow.js` orchestration scripts from the app package** — `apps/web-pwa/wave3-plexus.workflow.js:1` · medium · OBSERVED — `git rm` all six from `apps/web-pwa/` (they hardcode a machine-local scratchpad path and are recoverable from history) and drop the now-unneeded `!**/*.workflow.js` exclude from `biome.json`. (reported four times)
- [ ] **Gitignore `scripts/set-vercel-env.sh` so the embedded anon JWT is never committed** — `scripts/set-vercel-env.sh:0` · medium · OBSERVED — Add the filename (or `scripts/*-env.sh`) to `.gitignore`; it is currently untracked but flips prod env vars directly with a live key inline.
- [ ] **Move the dated handoff and phase reports out of the repo root** — `HANDOFF.md:1` · low · UNVERIFIED — Relocate `HANDOFF.md`, `PHASE-0-REPORT.md` and `PHASE-1-REPORT.md` into `docs/history/` with a dated prefix, leaving only the binding law files at root.
- [ ] **Delete the applied one-off factbase migration scripts** — `content/factbase/apply.sh:6` · low · UNVERIFIED — Remove `content/factbase/apply.sh`, `patch_validate.py` and `APPLY.md` — they hardcode personal paths and the work they describe is already applied.

### Root-level duplication
- [ ] **Delete `migrate-to-new-project.sql`** — `migrate-to-new-project.sql:1` · medium · UNVERIFIED — It is a hand-maintained duplicate of the five `infra/supabase/migrations` files; document the equivalent as a one-line concatenation in the infra README instead. (reported twice)
- [ ] **Resolve the empty `apps/expo-app` workspace** — `apps/expo-app/README.md:1` · low · UNVERIFIED — Either delete the directory and its README references, or add a minimal `package.json` so it stops sitting inside the `apps/*` workspace glob with nothing in it. (reported twice)

## Deferred / fold into later waves (design-law, a11y, perf, doc-drift, maintainability)

22 tasks to fix · 38 superseded (rebuilt in later waves)

### Design-law violations (→ UI overhaul wave)
- [ ] **Inline a first-paint background style in `index.html`** — `apps/web-pwa/index.html:18` · low · UNVERIFIED — Add a tiny inline `<style>` setting `color-scheme` and a `prefers-color-scheme` background so dark-mode users do not get a white flash. → UI overhaul wave.

### Accessibility (→ UI overhaul wave)
- [ ] **Restore the focus ring on the Wobo composers and quiz input** — `apps/web-pwa/src/wobo/Companion.tsx:579` · medium · UNVERIFIED — Delete the `outline: none` declarations so the global `:focus-visible` ring applies to the primary input. → UI overhaul wave. (reported twice)
- [ ] **Raise `--clss-ink-faint` to the WCAG AA floor** — `packages/config/src/tokens.ts:118` · medium · UNVERIFIED — Set `chrome.inkFaint` to the AA-passing values already computed for `ink[300]` in both themes. → UI overhaul wave.
- [ ] **Give the command palette a touch entry point** — `apps/web-pwa/src/shell/CommandPalette.tsx:316` · medium · UNVERIFIED — Export an opener (module store or a `clss-open-palette` event) and wire the existing Home affordance, so the palette is reachable on phones and in the installed PWA. → UI overhaul wave.
- [ ] **Make the Wobo drawer a real dialog** — `apps/web-pwa/src/wobo/Companion.tsx:339` · low · UNVERIFIED — Add `role="dialog" aria-modal="true"`, focus the composer on open, restore focus on close and handle Escape. → UI overhaul wave.
- [ ] **Move the palette’s combobox ARIA onto the input** — `apps/web-pwa/src/shell/CommandPalette.tsx:466` · low · UNVERIFIED — Put `role="combobox"`, `aria-expanded`, `aria-controls` and `aria-activedescendant` on the `<input>` and mark the wrapper `role="dialog"`. → UI overhaul wave.

### Performance — app shell and engines
- [ ] **Route-split the 2.1 MB eager entry chunk** — `apps/web-pwa/vite.config.ts:24` · high · CONFIRMED — Split at `App.tsx`’s single mount point while keeping the two first-paint screens eager, per the 2G/cheap-phone law. → UI overhaul wave.
- [ ] **Resolve nav intents before spending a gateway round-trip** — `apps/web-pwa/src/App.tsx:382` · medium · UNVERIFIED — Move `resolveDestination(text)` above the `sdk.llm.invoke` call in `ask()` and return early on a route hit. → UI overhaul wave.
- [ ] **Build the target rect map once per overlay render** — `packages/wobo/src/highlight-overlay.tsx:109` · medium · UNVERIFIED — Hoist the `targetsRef` lookup into a single `Map<string, DOMRect>` instead of measuring every mark against every target each frame. → UI overhaul wave.
- [ ] **Replace `targetsVersion` with a subscription** — `packages/wobo/src/context-bus.tsx:292` · medium · UNVERIFIED — Expose registration changes through `subscribeToTargets(cb)` so every target mount/unmount does not re-render the whole Wobo consumer tree. → UI overhaul wave.

### Performance — gateway and plexus (→ board wave)
- [ ] **Record lint refusals so a failed canonical is not regenerated every request** — `services/gateway/src/classess_gateway/plexus/validate.py:248` · medium · UNVERIFIED — Persist `refusedAt`/`lintFailures` on the canonical record that `_promote_after_lint_failure` already assembles and short-circuit on it. → board wave.
- [ ] **Preserve `xmlns` through SVG sanitization** — `services/gateway/src/classess_gateway/plexus/sanitize.py:76` · medium · UNVERIFIED — Force the namespace on the root before serializing, so the cache stops treating every sanitized diagram as permanently stale. → board wave.

### Maintainability
- [ ] **Make `SimSpec` a single definition** — `packages/contracts/src/generated/plexus.ts:142` · medium · UNVERIFIED — Have `SimRunner.tsx` import `SimSpec` from `@classess/contracts/plexus` and reconcile the drift back into `specs.py`. → board wave.
- [ ] **Separate the bun-test and Playwright directories** — `apps/web-pwa/test/x-browser.spec.ts:1` · medium · UNVERIFIED — Move `test/x-browser.spec.ts` and its config into `tests/` so one directory does not hold two suites run by two different runners. → folds into the Wave 4 repo cleanup.

### Documentation drift
- [ ] **Rewrite README.md against the real repo** — `README.md:63` · medium · UNVERIFIED — Fix the directory tree, replace the Phase-0 line with the live state and a pointer to HANDOFF.md, and rewrite the auth bullet. → folds into the Wave 2 deploy-truth pass.
- [ ] **Publish an explicit law precedence order** — `CONTEXT.md:46` · medium · UNVERIFIED — Add a precedence header to README.md naming DECISIONS.md > root law files (CONTEXT/DESIGN/WOBO/MOTION/SUBJECTS) > `docs/` as historical, and mark the phase-mandating docs as superseded. → folds into the Wave 2 deploy-truth pass.
- [ ] **Reconcile the shipped typeface with DECISIONS.md** — `apps/web-pwa/index.html:14` · medium · UNVERIFIED — Either self-host the faces under `public/fonts/` as DECISIONS.md promises, or amend the decision to record the CDN stand-in. → UI overhaul wave.
- [ ] **Reconcile the Google Fonts CDN link with the "bundled locally" stack law** — `apps/web-pwa/index.html:13` · low · UNVERIFIED — Add the `@fontsource` packages and import them from `main.tsx`, deleting the `<link>` tags and the two CDN entries from the CSP. → UI overhaul wave.
- [ ] **Declare all seven `VITE_` variables in `vite-env.d.ts`** — `apps/web-pwa/src/vite-env.d.ts:4` · low · UNVERIFIED — Give each its literal union type so the `App.tsx` casts can be dropped and a misspelled name becomes a compile error. → folds into the Wave 2 env pass.
- [ ] **Update the app README’s description and scripts list** — `apps/web-pwa/README.md:3` · low · UNVERIFIED — Match `package.json` including the e2e commands, and annotate which workspaces the root filter actually reaches. → folds into the Wave 2 CI pass.
- [ ] **Delete the stale SDK test assertion** — `packages/sdk/test/sdk.test.ts:38` · low · UNVERIFIED — `sdk.test.ts:38-40` asserts a constraint the auth work removed; `auth.test.ts:113` states the same guarantee correctly. → folds into the Wave 2 CI pass.
- [ ] **Drop the `wave14-shots/` premise from any cleanup brief** — `(no such path — wave14 files are flat at repo root)` · low · OBSERVED — Path verified not to exist — the wave14 screenshots are flat root-level files, already covered by the root-dump task in Wave 4. → folds into the Wave 4 repo cleanup.

<details><summary>Superseded in this wave (38)</summary>

- [ ] ~~**Move the conversation onto Home and delete the `chat` route**~~ — `apps/web-pwa/src/screens/Home.tsx:223` · high — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Stop inventing a CBSE Class 8 maths syllabus for catalog-less boards**~~ — `apps/web-pwa/src/screens/home/stops.ts:79` · high — superseded: rebuilt in Wave 6 (curriculum/catalog/frame)
- [ ] ~~**Replace the hero doors’ five-colour rotating aurora with one pigment**~~ — `apps/web-pwa/src/ui/kit.tsx:547` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Neutralize the home thread’s five always-on chrome pigments**~~ — `apps/web-pwa/src/screens/home/Thread.tsx:26` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Stop gating course Continue on video generation**~~ — `apps/web-pwa/src/screens/course/Composing.tsx:1032` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Refuse perturbation specs that are already broken at mount**~~ — `apps/web-pwa/src/engines/PerturbationSandbox.tsx:168` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Remove the drop shadows from the roadmap and BioScene chips**~~ — `apps/web-pwa/src/screens/AdventureRoadmap.tsx:917` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Bring the kit’s entrance choreography back to MOTION.md**~~ — `apps/web-pwa/src/ui/kit.tsx:620` · low — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Give the two Learn shelf affordances real destinations**~~ — `apps/web-pwa/src/screens/Learn.tsx:466` · low — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Route the daily "did you know" chip through Wobo**~~ — `apps/web-pwa/src/ui/AppHeader.tsx:396` · low — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Drop the magenta accent from the header chrome**~~ — `apps/web-pwa/src/ui/AppHeader.tsx:504` · low — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Remove or replace the "coming soon" dead-end in You**~~ — `apps/web-pwa/src/screens/You.tsx:674` · low — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Give BioScene foodWeb and dragLabel a keyboard path**~~ — `apps/web-pwa/src/engines/BioScene.tsx:1052` · high — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Make MapScene operable without a pointer**~~ — `apps/web-pwa/src/engines/MapScene.tsx:451` · high — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Honour `prefers-reduced-motion` app-wide**~~ — `apps/web-pwa/src/ui/kit.tsx:627` · high — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Skip the home first-visit theatre under reduced motion**~~ — `apps/web-pwa/src/screens/Home.tsx:253` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Guard the infinite decorative loops in SubjectScreen, Learn and Practice**~~ — `apps/web-pwa/src/screens/SubjectScreen.tsx:261` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Restore focus visibility on MiniWorkbook’s SVG label targets**~~ — `apps/web-pwa/src/engines/MiniWorkbook.tsx:488` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Make Discovery’s act-to-reveal gate keyboard-completable**~~ — `apps/web-pwa/src/engines/Discovery.tsx:578` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Hoist Punnett’s inline `CellBox`/`HeaderCell` to module scope**~~ — `apps/web-pwa/src/engines/BioScene.tsx:737` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Give the twin query bar a submit control**~~ — `apps/web-pwa/src/screens/ProgressScreen.tsx:288` · low — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Memoize the `chaptersBySubject` proxy resolution**~~ — `apps/web-pwa/src/data/catalog.ts:2316` · medium — superseded: rebuilt in Wave 6 (curriculum/catalog/frame)
- [ ] ~~**Tear down the 3Dmol viewer and its WebGL context**~~ — `apps/web-pwa/src/engines/ChemScene.tsx:1137` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Compute the WebGL probe once per session**~~ — `apps/web-pwa/src/engines/AnatomyScene.tsx:289` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Memoize expression tokenisation in MathScene**~~ — `apps/web-pwa/src/engines/MathScene.tsx:553` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Drive the projectile from a ref instead of a 60 fps `setState`**~~ — `apps/web-pwa/src/engines/PhysicsScene.tsx:337` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Switch AnatomyCanvas to `frameloop="demand"`**~~ — `apps/web-pwa/src/engines/AnatomyCanvas.tsx:91` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Give the Pyodide output harness a step/time budget**~~ — `apps/web-pwa/src/engines/cs/pyodide.ts:126` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Hoist the You heatmap’s localStorage read into a `useMemo`**~~ — `apps/web-pwa/src/screens/You.tsx:1251` · low — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Sanitize generated SVG once per render**~~ — `apps/web-pwa/src/engines/DiagramView.tsx:126` · low — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Mint workbook and flashcard ids lazily**~~ — `apps/web-pwa/src/engines/MiniWorkbook.tsx:633` · low — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Serve rendered MP4s over a media route instead of base64 in JSON**~~ — `services/gateway/src/classess_gateway/plexus/engines.py:1843` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Route CBSE through the same frame path as every other board**~~ — `apps/web-pwa/src/data/catalog.ts:2295` · medium — superseded: rebuilt in Wave 6 (curriculum/catalog/frame)
- [ ] ~~**Break up the 1160-line `You()` and 800-line `Onboarding()`**~~ — `apps/web-pwa/src/screens/You.tsx:716` · medium — superseded: rebuilt in Wave 7 (screens/chrome/onboarding)
- [ ] ~~**Add `Mark.fill` to `specs.py` and regenerate**~~ — `services/gateway/src/classess_gateway/plexus/specs.py:52` · medium — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Amend VIDEO-QUALITY.md to match the shipped video path**~~ — `VIDEO-QUALITY.md:4` · low — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Make the `Spec` base model forbid unmodelled fields as documented**~~ — `services/gateway/src/classess_gateway/plexus/specs.py:36` · low — superseded: rebuilt in Wave 5 (board/engines)
- [ ] ~~**Reconcile DerivationDepth’s advertised expand/collapse actions**~~ — `apps/web-pwa/src/engines/DerivationDepth.tsx:245` · low — superseded: rebuilt in Wave 5 (board/engines)

</details>

## Tally

- **Wave 1 — Lock the brain (security boundary)** — 43 findings across 37 tasks
- **Wave 2 — Production config, deploy truth, CI** — 40 findings across 29 tasks
- **Wave 3 — Main-flow bugs and data scoping** — 63 findings across 62 tasks
- **Wave 4 — Repo cleanup and test wiring** — 39 findings across 27 tasks
- **Deferred / fold into later waves** — 61 findings across 60 tasks
- **Total** — 246 findings across 215 tasks (all 246 audit findings represented exactly once)
- **Replace, don't patch (WOBO-PLAN §13)** — 141 tasks to fix · 74 superseded, rebuilt in Waves 5 to 7

<!-- AUDIT-SECTION-END -->

## Wave 5 — The nervous system and the board

### 5.1 Surface registry (the screen sense)
- [ ] **Registry contract** — `packages/wobo/src/registry.ts`: `registerSurface({ id, title, description, targets: [{ id, kind, label, rect(), actions: [{ name, description, inputSchema, run }] }] })`; WebMCP-shaped so `navigator.modelContext` can be adopted when Chrome ships it
- [ ] **Lifecycle** — register on mount, unregister on unmount; targets re-measure on scroll and resize; stable ids across renders
- [ ] **Screens registered** — home thread (stops, composer, chips, doors), Learn grid, Subject and chapters, Course players (cards, beats, continue), Practice, Progress (twin), You (profile, board and class pickers, settings), Onboarding, Command palette, the plane itself, Download center
- [ ] **Engines expose targets** — every interactive publishes its semantic parts (axes, points, sliders, molecules, labels, cells, map regions) as targets with live state; fixes the seven unattached scene refs from the audit
- [ ] **Registry snapshot** — a serialiser that produces the "what is on screen" part of the context packet in under 2 KB, with truncation rules
- [ ] **Dev inspector** — an overlay (dev only) that shows registered targets and their ids for QA

### 5.2 Gesture layer (the gesture sense)
- [ ] **Transparent gesture layer** over the whole app: text selection, cursor lasso (freehand circle), hover-and-hold, long-press on touch, two-finger circle on touch, desktop hotkey (hold to talk)
- [ ] **Focus object** — `{ kind, targetIds[], text, numbers[], rect, ownerState, screenshotFallback? }` computed from `elementsFromPoint` and the registry; never a screenshot for our own UI
- [ ] **Focus affordance** — a quiet chip near the focus ("ask Wobo about this"); the orb leans toward it; escape clears
- [ ] **Learner ink capture** — strokes drawn by the learner become focus objects with their geometry; stylus pressure on tablets
- [ ] **Accessibility** — every gesture has a keyboard path (select with keyboard, then hotkey); focus objects announce to screen readers

### 5.3 Context packet and the `wobo.turn` seam
- [ ] **Packet builder** — focus + registry snapshot + route + task state (beat, attempt, score) + learner mind summary (mastery band for the current topic, recent mistakes, preferred analogy, consent tier, plan) + last N turns, under a token budget with priority truncation
- [ ] **Turn protocol** — `wobo.turn` streams a mixed sequence of `say`, `ink`, `action`, `ask`, `card` events; ordering guarantees; cancellation on interrupt; resume after network loss
- [ ] **Interrupt** — the learner can stop her mid-sentence (tap, key, voice); ink stops with the voice; partial board state stays
- [ ] **Latency budget** — first speech under 1.5 s on a cheap Android phone over 4G; first stroke under 1 s; measured, not assumed

### 5.4 Ink renderer and the board grammar
- [ ] **Grammar v1** — marks: point, circle, underline, arrow, bracket, strike, number, write, erase, wipe; shapes: line, polyline, curve, polygon, ellipse, axis, grid, table, label, tex, bond, atom, region; each with an id, anchor, style, and timing
- [ ] **Streaming plan protocol** — plan chunks interleaved with speech; renderer draws ahead of speech; a plan chunk can reference earlier ids
- [ ] **Renderer** — one SVG layer; pen physics (anticipation, overshoot, settle); chalk and marker aesthetics per theme; the pen sound; ink that fades; eraser swipe; a fresh board; reduced-motion path draws instantly
- [ ] **Anchoring** — every stroke anchored to a registry target or a learner-circled region; survives scroll, resize, theme change, and layout shift
- [ ] **Handwriting** — Caveat glyph-to-stroke so `write` genuinely writes, paced to speech; the two-word-first-sentence rule preserved for TTS
- [ ] **Equations** — `tex` rendered to paths and written stroke by stroke, not revealed
- [ ] **Layout engine** — places objects on the plane and the full board so nothing collides; label margins; auto-scroll and zoom when the board fills
- [ ] **Object memory** — re-point, move, fade, redraw any earlier object by id within a session; she can say "this one" and tap it
- [ ] **Bidirectional** — the learner draws on the same layer; she reads their ink; moving her tangent updates her numbers
- [ ] **Timeline and export** — scrub a board's history; save to notes; export as a shareable image (the proof loop)
- [ ] **Performance** — thousands of strokes at 60 fps on a cheap phone; virtualised history; GPU-friendly transforms only

### 5.5 Three presentations
- [ ] **Ink on the screen** — over any surface, including a paused video (our videos expose frame state from the scene spec at the paused timestamp), a syllabus outline, a setting, a sim; fades
- [ ] **The plane** — frosted overlay board sliding in from the orb; drag, resize, pin, minimize to thumbnail with ink intact; sheet on phones; summon by gesture or the word "board"; ink persists until wiped; multiple boards per session; "fresh board"
- [ ] **The full board** — inside lessons, full-bleed; the course player becomes a board with cards as regions
- [ ] **Presentation choice** — her rule (pointer or one line on screen; derivation or diagram on the plane; lesson on the full board) plus learner override by word or gesture
- [ ] **Video handoff** — pause, ask, she annotates the frame or opens the plane beside it, then returns the learner to the paused position

### 5.6 Domain pipelines under the grammar
- [ ] **Math** — axes, curves, tangents, constructions with visible compass arcs, number lines, long division, area models, derivations line by line with the substituted step underlined
- [ ] **Physics** — free-body diagrams with forces appearing as named, projectiles with decomposed components at the apex, circuits symbol by symbol, ray diagrams through lenses, waves with wavelength brackets
- [ ] **Chemistry** — molecules from SMILES via RDKit in a chemist's stroke order, benzene alternation, titration curves, orbital sketches, equation balancing with ticking coefficients, electron dot diagrams
- [ ] **Biology and social science** — labelled cells, food webs with energy-direction arrows, timelines, shaded maps, Punnett squares filled one cell at a time
- [ ] **Verification** — every quantity through CAS, dimensional analysis, and balance checks before it is drawn; a failed check redraws or refuses, never serves
- [ ] **Golden boards** — a regression suite of prompts with expected board outcomes (structure, not pixels) for every pipeline

### 5.7 Companion modes and hands
- [ ] **Show me** — a visible cursor glides to the real control, taps, narrates, via the registry; works on every registered screen
- [ ] **Do it** — executes under the permission ladder (recommend, prepare, execute with permission, safe automatic); communicate, buy, submit, delete always ask
- [ ] **Explain this** / **why is this wrong** / **check my work** / **quiz me** / **say it in my world** (analogy) / **read it aloud** / **teach it back to me** — each a mode with its own prompt shape and board behaviour
- [ ] **Watch me do one** — she drives a sim with the cursor visibly, then hands over; first rung of the assistance ladder
- [ ] **Proactive lean-in** — three wrong actions or forty idle seconds offers a pointer; governed by the quiet/balanced/proactive dial; never interrupts speech or typing
- [ ] **Voice** — push-to-talk on the orb and a desktop hotkey; accent by the learner's country with American English fallback; no always-listening; barge-in stops her
- [ ] **Memory page** — what she remembers, set by consent tier, visible and erasable; erasure propagates to the brain
- [ ] **Vision fallback** — for content we did not make (a PDF, an embedded page) the circled region is read by a vision call; labelled as such
- [ ] **Engine absorption plan** — each existing engine mapped to board idioms; absorbed one at a time behind a flag without breaking lessons

## Wave 6 — Curriculum

### 6.1 Registry of boards and curricula
- [ ] **Data model** — `framework { id, name, aliases[], country, region, kind (national|state|international|open|homeschool|online), levels[], official_site, sources[] }`
- [ ] **Seed list** — national boards, every Indian state board, NIOS, IB (PYP/MYP/DP), Cambridge (Primary/Lower Secondary/IGCSE/A Level), Edexcel, AP, US states, UK nations, Australian states, Canadian provinces, Singapore, common homeschool programmes; drafted by Opus, verified by Sonnet against official sites
- [ ] **Type-to-select search** — aliases, fuzzy matching, country hint from locale; "not listed? tell me" path always visible
- [ ] **Grades 4 to 13** per framework; school level only

### 6.2 Ontology and versions
- [ ] **Schema** — framework → version (academic year) → level → subject → unit → topic → learning objective; provenance on every node (source URL, page, extracting model, verifier, verified_at); CASE export mapping
- [ ] **Immutable versions** — new academic year is a new version; never overwritten; learners pinned to a version with an offered upgrade
- [ ] **Storage** — Supabase tables under a `curriculum` schema with RLS (read for all authenticated; write by service role); indexes for search
- [ ] **Move the catalog into the database** — replace `apps/web-pwa/src/data/catalog.ts` and the "frame" system with on-demand fetch; the client caches per framework version offline
- [ ] **Concept graph mapping** — board topics map to canonical concepts so generated content is reused across boards; prerequisite edges kept

### 6.3 Discovery job
- [ ] **Web search and fetch capability** in the brain (one provider behind an interface; keys in env); PDF and HTML extraction
- [ ] **Extraction** — Opus turns an official syllabus into the schema; strict JSON; page references kept
- [ ] **Verification** — second-model cross-check; structural checks (chapter counts against the textbook table of contents, level coverage, duplicate detection); status `provisional` until passed
- [ ] **Promotion** — automatic when checks pass and two learners have used it without edits; owner review queue for anything flagged
- [ ] **Honest labels** — "Official CBSE 2026-27, verified" / "Found online, checking" / "Drafted from your syllabus, check it"
- [ ] **Failure path** — nothing found within a time budget → own-syllabus path offered immediately

### 6.4 Own syllabus and edits
- [ ] **Own syllabus path** — paste, type, photo (camera or upload), PDF; structured by Opus into a personal syllabus; the learner confirms
- [ ] **Editable overlay** — add, remove, reorder, "not in my school", attach a textbook, rename; edits live on top of the canonical version and survive updates
- [ ] **Community contribution** — optional offer to the global registry; moderated; credited anonymously

### 6.5 On demand
- [ ] **Lazy generation** — chapter list on selection, topics on open, content on open; cached and shared across boards through the concept graph
- [ ] **Freshness crawler** — scheduled job watches official pages, hashes documents, diffs new releases; Wobo tells the learner what moved
- [ ] **First boards verified** — CBSE, ICSE, the seeded state boards, NIOS, then IB and Cambridge, then US and UK via their open APIs (Common Standards Project, Oak National Academy)

## Wave 7 — Experience

### 7.1 Landing page (**design**)
- [ ] **Chalk cursor with fading ink trace** — WebGL, silky at any frame rate; warms on headings; off on touch devices
- [ ] **Wobo hero** — real-time jelly orb in a shader; weight and squash; eyes follow the cursor; blinks; falls back to a static image on weak devices
- [ ] **Scroll-driven lesson** — she draws as you scroll: a triangle, self-labelling angles, a derivation down the margin, a molecule assembling; pinned sections; the visitor controls the pace
- [ ] **Live mini-board** — type a prompt and watch her draw, on the page, before sign-up; rate-limited through the brain's anonymous budget
- [ ] **Story sections** — every board on earth (a globe of frameworks); the parent's weekly artifact; how it's free; pricing annual-first (dummy values until real); the invitation
- [ ] **Copy** — outcome-led, calm, certain; sentence case; no exclamation marks
- [ ] **Performance** — lazy-loaded effects, under 1 MB before interaction on a cheap phone, reduced motion honoured, Lighthouse 90+ on mobile
- [ ] **SEO and sharing** — titles, descriptions, Open Graph images of the board, sitemap

### 7.2 Auth
- [ ] **Login and sign-up screens** — Google, phone OTP (India first), email as fallback; brand-neutral; Wobo present on the screen
- [ ] **Anonymous session upgrade** — the anonymous learner from the landing demo becomes the real account without losing anything
- [ ] **Session and device handling** — multiple devices, sign-out everywhere, re-auth on 401 in Wobo's voice
- [ ] **Account page** — name, avatar, board and class, plan, usage, memory page link, delete account

### 7.3 Legal (**diplomatic drafts; lawyer review before launch**)
- [ ] **Terms of service**
- [ ] **Privacy policy** — DPDP, children's data, what is stored, what is remembered, retention, deletion model
- [ ] **User agreement and acceptable use**
- [ ] **AI disclosure** — that Wobo is an AI, what it can and cannot do, how to report a problem
- [ ] **Cookie and consent notice**
- [ ] **Parental consent flow** for minors; consent tiers wired to the brain
- [ ] **Refund and subscription terms**
- [ ] **Deletion path** — raw personal data leaves; de-identified insight stays; link severed; a confirmation email
- [ ] **owner** Lawyer review before launch

### 7.4 Onboarding — the first five minutes (**design**)
- [ ] **Intro** (done) then **sign in first** — Google or phone OTP; name from the account; birthdate only where consent law needs it, with the parent path
- [ ] **One question** — what are you studying right now? Text, voice, or a photo of a textbook or timetable
- [ ] **Inference and one-tap confirm** — board and class inferred; board search with "not listed? show me your syllabus"
- [ ] **The aha** — she teaches one real thing from that topic on the board, drawing as she talks
- [ ] **Guided tour** — Wobo shows what they can do and how: the thread, Learn, Practice, the board, the plane, asking by circling, push-to-talk; pointing at the real controls; the learner tries each; skippable, resumable
- [ ] **Endowed progress** — three quick questions light the map
- [ ] **Interests** — folded into the first analogy choice (cricket, Formula 1, music, games), not a list
- [ ] **Returning learners** — no onboarding; greeted by name; the tour available from the palette
- [ ] **Edge cases** — Google return in the same tab, offline mid-onboarding, unsupported board, under-age with no parent yet

### 7.5 UI raise (**design**)
- [ ] **Typography** — Poppins for UI, Caveat for her hand; tokens updated; Google Sans references removed
- [ ] **Tokens** — light and dark complete; every surface through tokens; no hardcoded whites; one hit of pigment; no shadows; 3 px radius
- [ ] **Chrome** — header, palette, doors, cards, buttons, inputs, chips, toasts, sheets redesigned to one system
- [ ] **Home** — the thread made genuinely minimal; chat on the home front door, no separate chat route
- [ ] **Learn, Subject, Course, Practice, Progress, You** — a design pass on each against `DESIGN.md`, Brilliant as the floor
- [ ] **The twin** — hero art that breathes and ignites; independent versus support-dependent visible; screenshot-worthy
- [ ] **Illustration and empty states** — the sigil system extended; every empty state designed
- [ ] **Motion** — one system; entrance choreography; magnetic buttons; reduced motion honoured everywhere
- [ ] **Mobile** — 360 px to tablets; touch targets 44 px; no fixed widths; safe areas
- [ ] **Accessibility** — keyboard paths for every course beat; focus-visible; aria on icon buttons; contrast checked in both themes
- [ ] **White-label sweep** — nothing user-facing names Classess, Claude, Gemini, OpenAI, Google, or any provider; provider errors rewritten in Wobo's voice; model ids never leave the brain
- [ ] **Owner approval** — two or three screens shown before rollout

### 7.6 Board-native content and evaluation
- [ ] **Courses** — the course player as a full board; cards as regions; beats as board moments
- [ ] **Practice runs** — questions asked on the board; working graded, not only the answer
- [ ] **Mini-workbooks, flashcards, derivations, word problems** — as board idioms
- [ ] **Boss battles** — a live problem she draws; solved on the same surface; victory theatre kept
- [ ] **Daily thread, XP, streaks with taste, trophies** — retained and refined
- [ ] **Free-reasoning grading** — text, voice, and handwriting; rubric versions; confidence bands (auto-accept high, escalate middle)
- [ ] **Assistance ladder** — Learn, Coach, Hint, Work-with-me, Check-my-work, Challenge, Assessment; support visibly fades
- [ ] **"I think I'm right"** re-grade path
- [ ] **Calibration harness** — human-graded sets, tracked agreement, adversarial hardening
- [ ] **Misconception detonation** — from the learner's own numbers; flagged for spaced re-testing
- [ ] **Spaced retrieval** — FSRS actually backing the due queue

### 7.7 Email programme
- [ ] **Sender** — brand-neutral until the domain arrives; then the Wobo domain
- [ ] **Welcome, first-aha follow-up, progress moments, weekly parent artifact, streak with taste, win-back** — templates in the design system
- [ ] **Preferences and unsubscribe**; no schedule-driven nagging

### 7.8 Growth and marketing, built in
- [ ] **Parent link** — created in settings; a weekly, WhatsApp-native progress artifact drawn from the child's own boards; the share page is the upgrade surface with one calm button; "show mom what I just cracked" from a victory
- [ ] **Gifts, not gambles** — behaviour-timed gifts that are the same for everyone in that state: abandoned checkout → a gifted Plus week; cancel flow → pause, downgrade, or a gifted month, then a graceful exit with the deletion path visible; real streak and mastery → surprise generosity; exam season → unlimited weekends with a true deadline
- [ ] **The gift box moment** — at a genuine win Wobo hands a wrapped box; a joyful reveal on the board; inside is a real, uniform gift with plain terms; no random wheel, no fake countdown, no anxiety (India's dark-pattern guidelines, DPDP, app-store rules, and our own calm law)
- [ ] **Paywall timing** — the ask lands just before the wow it unlocks, framed as pushing limits, never on a timer; annual-first; charm pricing; decoy tiers; dummy numbers until the owner sets real ones
- [ ] **Share loops** — the challenge loop (share a hard problem, never the answer, WhatsApp-native); the proof loop (the board as a branded mastery image); referrals rewarded in learning, not cash
- [ ] **Lifecycle messaging** — email, push, WhatsApp on progress moments: welcome, first aha, first board saved, first boss, streak with taste, win-back after seven quiet days, exam-calendar surges; preferences and unsubscribe; never schedule-driven nagging
- [ ] **Acquisition** — programmatic SEO pages per board, class, subject and chapter with a live mini-board; app-store optimisation; build-in-public; velvet-rope invites with insider lore at launch
- [ ] **Experiment engine** — every lever flaggable and A/B-testable; the adaptive tactic engine selects copy, reward, framing and timing per archetype; attribution and cohort retention tracked
- [ ] **Integrity layer** — fraud checks on referrals and sponsored seats
- [ ] **Compliance rails** — marketing consent lives with the parent for minors; DPDP-clean; no dark patterns in cancel flows; every message has an off switch

## Wave 8 — Platforms and launch

- [ ] **Capacitor project** replacing the empty Expo workspace; iOS and Android; phones and tablets
- [ ] **Native plugins** — camera, microphone, push notifications, haptics, native gestures, keyboard handling, safe areas
- [ ] **Store assets** — icons, splash, screenshots, listings, privacy labels
- [ ] **Tauri desktop** — Mac, Windows, Linux from the same code; auto-update; the desktop hotkey
- [ ] **Offline** — pre-synced learning packs; the board works offline for cached lessons
- [ ] **Monitoring** — error tracking, budget dashboards, uptime, cost per learner
- [ ] **Final deploy** on green — web, gateway; domain swap when the owner says
- [ ] **Launch checklist** — accounts, budget dials, legal live, monitoring, rollback, support inbox

## Wave 9 — Horizons

- [ ] Snap a homework page; she grades the working
- [ ] Handwriting canvas with math recognition
- [ ] Code-switching across Hinglish and vernacular; vernacular interfaces
- [ ] Parent mode narrating the week; WhatsApp presence
- [ ] Knowledge twin queryable in plain language
- [ ] Teach-to-unlock and the protégé economy (moderated)
- [ ] Earn-it-forward and the integrity layer
- [ ] Rive rig for the body, if it ever earns its cost
