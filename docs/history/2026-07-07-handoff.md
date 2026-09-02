# HANDOFF.md — session continuation note (2026-07-07, the launch day)

> For the next Fable session: read this fully, then execute top to bottom. All laws live in the
> memory ledger (auto-loaded). Repo: `/Users/depl/Documents/classess-learner`, branch `the-life`
> (push: `git push origin the-life`). Owner: Shreyan — full autonomy granted, deploy on green,
> he only announces. Evidence before claims, always.

## State at handoff

**LIVE at https://learner.classess.com** (launched today): waves 1–16 — Wobo presence (sees
screens code-level, dossier, freehand drawing ink synced to voice via The Tutor's Hand,
navigation, push-to-talk, guardianship + wellbeing tiers), gamification (victory theatre,
combos, daily quests, XP rings, Ceremony trophies), the Expedition world (inhabited, cast
catalog), auth-first onboarding wired (see caveats), CBSE-10 frame with downloading discipline,
board-shared content cache + immortal version ledger + deterministic SVG lint + validation
gate, content universe (discovery shell + 10 interactive types), video pipeline COMPLETE
(Remotion worker proven: beat-synced MP4 69ms delta, watermark bottom-right, render queue on
promotion, MotionPlayer prefers rendered MP4; Manim rung armed, renderer future), Google
sign-in live (bundle-verified), Singapore gateway ~1.3s turns.
**Model order (owner verdict, live-verified):** content engines primary = `frontier.reason`
(Opus), quality-backup = `openai.frontier` (GPT-5.5), best-of promotes; `wobo.turn` = haiku.
Gateway 174 tests green at commit `998d599`; last pushed commit `0b7c8bb`+.

## CRITICAL: the mid-session lockout

~11:50 the OS began EPERM-blocking ALL pre-existing files in the repo (shell + tools + agents).
Only NEW files could be created. If access is still broken: restart session / macOS Privacy &
Security → Full Disk Access. Consequences to repair below.

## DO IN ORDER

1. **Reconcile the substrate waves (17+18)** — engines were CREATED but not WIRED (lockout):
   - New files on disk: `engines/MathScene.tsx` (Mafs; dep installed), `engines/PhysicsScene.tsx`,
     `engines/ChemScene.tsx`, gateway `plexus/{dimensions,physics,chem}.py`, `content/factbase/`
     (+ possibly CS ramp / concept-keying / codegen from wave 17 — check journal).
   - Exact wiring patches (verbatim code) live in the wave journals:
     `~/.claude/projects/-Users-depl-Documents-classess-learner/6aa90296-d29d-4047-861b-907e346f7b79/subagents/workflows/wf_ca9319f7-a34/journal.jsonl` (wave 17)
     and `.../wf_e1ce96e0-152/journal.jsonl` (wave 18): engines.py `_CARD_ACTIVITIES`
     registrations (mathScene/physicsScene/chemScene) + compose-prompt schema lines,
     Composing.tsx parseActivity branches + render seams, EnginesGallery benches, lint.py
     extensions. Apply them, `bun install` in apps/web-pwa (@rdkit/rdkit, 3dmol, mafs pending
     node_modules), `bunx biome check --write src`, then FULL gates (web typecheck/biome/build/
     unit; gateway pytest 174+ / ruff). Commit + push.
2. **Fix prod voice (502)**: Railway var `GOOGLE_AI_API_KEY` already holds the NEW billed key
   (`AQ.Ab8RN6KPJ…` — direct Google probe returned 200 + audio). A redeploy was fired via
   GraphQL but TTS still 502s — check `railway logs` (run railway ALWAYS from repo root; token
   = RAILWAY_API_TOKEN in .env.local), confirm the deployment actually cycled, redeploy if
   stale, prove `POST /v1/voice/tts` = 200 on classess-learner-production.up.railway.app.
3. **Fix web deploy**: the domain may still serve pre-onboarding bundle `index-BuECStO1.js`.
   In apps/web-pwa: `vercel link --yes --project classess-learner --scope depl-shreyan` →
   `vercel deploy --prod --yes` → PROVE live bundle greps `Tap to begin` = 1. Exit codes lie;
   only the bundle grep counts.
4. **Launch substrate phase 3**: bio engines (drag-label SVG, punnett, food webs, Three.js
   anatomy, taxonomy) + social engines (MapLibre+D3-geo maps, timelines, event-ordering,
   supply/demand D3), validated against `content/factbase` (built wave 18). Apply the
   EMPOWERMENT LAW (task #28 metadata): specialists also upgrade EXISTING engines in place
   (Mafs under what-ifs/perturbation, dimensional analysis over all physics sims, RDKit in any
   diagram with molecules, factcheck over all bio/social content). Additive law: new engines
   are additions, never replacements — the composer mixes everything.
5. **ONE substrate deploy when all green** (owner law: deploy once everything is ready): web +
   gateway (from repo root), then closing probes: healthz live, `engine.compose →
   anthropic/claude-opus-4-8`, voice 200, domain bundle fresh. Report with evidence.

## Owner-side items (surface, don't block)

- He signs in as the FIRST real account on prod (proves login→home live; the existing-user
  path is coded but awaits a real Google round-trip).
- Supabase `keepraxqagzgjrrweryt` needs `birthdate` + `interests` columns on
  `learner.profiles_cache` for cross-device restore (local-first meanwhile; sentinel =
  archetype_slot).
- Remotion company license when scale demands (README note in services/render-worker).
- Physics agent skipped Rapier for exact closed forms (correctness > plausibility) — flagged
  for owner override if true many-body dynamics ever needed.

## Traps learned today (do not repeat)

- `railway up` MUST run from repo root — cwd persistence caused silent no-op deploys twice.
- Client "operation timed out" on railway up can still mean server-side build succeeded —
  verify via `/v1/capabilities`, never assume.
- Vercel deploys don't always re-alias the domain; a missing `.vercel` link creates phantom
  projects — always link, deploy, then bundle-grep the live domain.
- PWA service worker clings to stale bundles — hard-refresh when testing prod.
- Gates: check exit codes explicitly; `tail` swallows failures.
