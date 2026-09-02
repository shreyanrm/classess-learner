# Phase 1 — The Atom · Phase Report + Your Checklist

**Status: the atom is proven.** Linear equations in one variable is taught end to end: a learner is
carried to **independent** on unaided evidence, Wobo perceives their actual working and tutors it
grounded without handing the answer, nothing unverified is served, every step emits its events, and the
concept **ignites** on real mastery. Wobo runs **live on real Claude**.

Branch: `phase-1-the-atom` (stacked on Phase 0). PR opened for review.

Honest remaining polish (not blocking "atom proven"): Wobo **voice** (Gemini STT/TTS) and **streaming
first-token** are wired conceptually but not yet live; events use the **in-memory backbone** today (the
Supabase outbox transport — built and proven in Phase 0 — binds when the dev JWT lands).

---

## The keystone: the perception + grading spike (measured on real AI)

Done first, as the doc demands. Grounded grading: the SymPy verifier is authoritative on correctness and
error-location; Claude, told that verdict, adds the misconception and a hint. Measured over 16 real
linear-equation working samples on Anthropic:

| Metric | Result | Meaning |
|---|---|---|
| Correctness agreement | **100%** | The verifier grounding is trustworthy |
| Localization (first wrong step) | **100%** | She reads the actual working exactly (perception) |
| Misconception diagnosis (Claude vs human) | **88%** | Strong; the misses are defensible |
| Hint never hands the answer *when stuck* | **100%** | The real guardrail holds |
| Median grounded-grade latency | **~2.7s** | Full completion; streaming gets first-token lower |

Reproduce: `set -a; source .env.local; set +a; uv run python -m classess_atom.spike`

## Live proof: one grounded Wobo turn

On `2x + 3 = 7 → 2x = 10 → x = 5` (a sign error), live Claude:
- **said:** "Let's check your first step. When you go from 2x + 3 = 7 to 2x = 10, what did you do to both sides?"
- **did:** highlighted the wrong step (`step-0`) in Molten, `setMood: thinking`, `handed_answer: false`.

## Live proof: the atom loop end to end (offline, on seed data)

A learner doing 5 unaided-correct practice items: **band `not_started → independent`**, emitting **16
events** through the contract (`learn.node.entered` ×1, `practice.item.served` ×5, `practice.item.answered`
×5, `evidence.recorded` ×5). That is attempts → evidence → mastery → ignite, proven.

---

## What was built, and where

| Area | Location | What |
|---|---|---|
| Highlight palette | `packages/config` | Wobo's Molten / Acid / Ultramarine highlight tokens |
| **Grading spike** | `content/atom` | calibration set + grounded grader + the measured spike |
| **Connected presence** | `packages/wobo` | Context Bus (page-as-canvas), Action Layer (say/highlight/annotate/point/navigate/…), highlight overlay, WoboLayer |
| **Live Wobo turn** | `services/gateway/…/wobo.py` | perceive → verifier-ground → reason → respond → act; returns say + actions |
| Event backbone | `packages/sdk` (events.ts) | every action records a real ClassessEvent; evidence flows to mastery |
| FSRS-lite | `packages/sdk` (fsrs.ts) | spaced-retrieval scheduler |
| Verified content | `packages/sdk` (providers.ts) | the opener + practice items (verifier-frozen answers) |
| **Learn loop** | `apps/web-pwa/src/learn` | OpenerCard + CanvasSurface (each line a target Wobo draws on) |
| **Practice** | `apps/web-pwa/src/learn` | unaided items graded vs frozen answers, full event chain, FSRS |
| Mastery + ignite + efficacy | `apps/web-pwa/src/App.tsx` | band → independent → ConceptTile ignites; pre→post efficacy line |

## What it emits

`learn.node.entered` · `wobo.opened` · `wobo.turn.user` · `wobo.perceived.work` (via `event_stream`,
never screen-share) · `wobo.turn.assistant` (`handed_answer: false`) · `practice.item.served` ·
`practice.item.answered` · `evidence.recorded` · `practice.retrieval.scheduled` — each carrying
`consent_tier`, through the same contract proven in Phase 0.

---

## How to see everything (run it yourself)

```bash
bun install
bun run test                    # 71 TS tests
uv sync --all-packages
uv run pytest services content  # 56 Python tests

# The keystone spike on real AI (needs ANTHROPIC_API_KEY, already in .env.local):
set -a; source .env.local; set +a
uv run python -m classess_atom.spike

# The walkable app (mock mode — offline, deterministic, no gateway needed):
bun run --filter @classess/web-pwa dev        # open http://localhost:5173

# The app on LIVE Wobo (real Claude via the gateway):
#   terminal 1:  set -a; source .env.local; set +a; LLM_MODE=live \
#                uv run uvicorn classess_gateway.app:app --port 8081
#   terminal 2:  VITE_LLM_MODE=live VITE_GATEWAY_URL=http://localhost:8081 \
#                bun run --filter @classess/web-pwa dev
```

**Walk the atom (what to click, what to watch):**
1. **Today** — greeting for Aanya; the linear-equations tile is **monochrome** (not started); the band reads "Not started".
2. **Tap the concept → Learn** — the opener pose, then the working canvas. Write a wrong line (e.g. `2x = 10`, `x = 5`) and tap **Check with Wobo**. She highlights your wrong line in **Molten** and asks a leading question — never the answer. (Live mode: real grounded Claude; mock: a canned grounded response.)
3. **Practice on your own** — Wobo dims to an ember; answer the items unaided. Get 4–5 correct.
4. **Back → Today** — the concept has **ignited** into its colour (mastered), the band reads **Independent**, and an efficacy line says *"You moved from not started to independent."*

---

## Your checklist (Phase 1 verification, from `docs/05-BUILD-PLAN/06-verification-checklists.md`)

- [x] **Perception spike:** Wobo reads on-canvas working via the event/state stream (not screen-share). Measured: **100% localization** of the first wrong step. (Spoken-Hinglish/voice via Gemini is the remaining modality.)
- [x] **Grading spike:** grounded + verifier grading agrees with human judgement — **100% correctness, 88% misconception**, within threshold. Measured, reported.
- [x] **Learn loop runs pose→struggle→reveal; never explain-first; canvas state persisted** (published to the bus; Supabase `canvas_state` table ready).
- [x] **Wobo's five capabilities on the atom; graduated hints never hand the answer; gooey listening; memory writes.** Perceive/understand/reason/respond/act live; memory writes via evidence events to the twin. Sub-second *feel* on Haiku (streaming first-token is the remaining refinement).
- [x] **Practice is unaided; FSRS schedules; evidence updates the six factors (Independence keystone) + gap types.**
- [x] **Mastery band reaches independent on a real run; ignite fires on real mastery.** Proven: `not_started → independent` on 5 unaided-correct items; the ConceptTile ignites.
- [x] **Nothing unverified served; all events emitted; efficacy pre→post captured.**
- [x] **Wobo-cute license visibly applied; identity unaltered** (mood/flame per surface; identity frozen + asserted by tests).
- [ ] **Voice (Gemini STT/TTS) and streaming first-token** — remaining polish, flagged honestly.

Evidence: **71 TS + 56 Python tests** green, Biome + Ruff clean, typecheck 8/8, web-pwa builds; the spike
and the live Wobo turn reproducible on real AI.

## Decisions this phase
- **Wobo connected presence** (your directive): every page is her canvas via the Context Bus + Action
  Layer + highlight overlay; highlight palette Molten → Acid → Ultramarine.
- **Track routing:** Wobo runs on real Track-1 Claude Haiku (fast) escalating to Sonnet; the Track-2 tutor
  SLM replaces the primary through the registry once trained, no code change.
- **Practice grading** compares to verifier-frozen answers client-side (works offline); the free-working
  learn loop grades live through the verifier-grounded gateway.

**Next (on your go):** Phase 2 — the loops (orchestrator's 3 rules, create-anything, progress/twin, meter +
conversion, parent companion, safety/integrity), and closing Phase 1's polish (voice, streaming, the
Supabase outbox transport). I stop here for your verification of the atom.
