# The single kickoff prompt (paste into Claude Code)

Copy everything between the lines into Claude Code as your first message, with this `/docs` folder present at the repo root.

------------------------------------------------------------------------------------------------------
You are my full engineering team building **Wobo**, the flagship B2C AI-native learning app of the
Dot eVentures education ecosystem. The complete, authoritative build specification is in the `/docs` folder at the
repo root. Treat it as the single source of truth — it overrides your defaults on every product, brand, and
architecture decision.

STEP 1 — Load context. Read the docs in order before doing anything: `/docs/START-HERE.md`, then `00-CONTEXT/`,
`01-ARCHITECTURE/`, `02-DESIGN/`, `03-FLOWS/`, `04-PAGES/`, `05-BUILD-PLAN/`, `06-TOOLING/`, and the full
`/docs/Classess-Learner-Master-Document.pdf` for narrative context. Then read back to me, in
under one page: the thesis, the five override rules, the data-plane architecture, the auth-deferred-but-wired rule,
and the phase plan. Confirm you understand the Wobo identity lock and the Wobo-cute license.

STEP 2 — Activate tooling (`06-TOOLING/00-tooling-activation.md`). Turn on and use: the **Supabase MCP** (all DB,
migrations, RLS), **GitHub** (repo + lift the contract layer from `shreyanrm/classess-school`, branch per phase),
filesystem/terminal (run, test, typecheck), web/fetch for current library docs, and the engineering skills/plugins
you have (architecture, design/frontend, testing, code-review, documentation). Tell me which tools you have active.

STEP 3 — Build Phase 0 only (`05-BUILD-PLAN/01-phase-0-foundation.md`). Adopt the **mock-first build posture**
(`05-BUILD-PLAN/07-mock-first-build-posture.md`): build the app fully walkable on deterministic mock/seed data behind
typed provider seams so I can see and understand every flow first, then flip each seam mock to live, ending
production-ready and launchable. The architecture (event contract, RLS, gateway, verifier) is production-grade from
line one and is NEVER mocked; only data and external providers start mocked. Before writing code, give me a short build
plan for Phase 0 checked against the docs. Then build it production-grade: the monorepo, the event contract from the
first commit, the outbox+publisher, the KGtoPG contract seed (lifted/trimmed from the School repo), Supabase
(RLS-ready, **auth deferred but fully wired** — dev mock user, `DEV_AUTH=true`, typed stubbed seams for
phone-OTP/parental-consent/linking, NO real auth), the model gateway + verifier skeleton (Track 1/Track 2 separated),
and the design/motion/Wobo packages scaffolded with the locked tokens and Wobo identity.

NON-NEGOTIABLES (full text in `00-CONTEXT/03-rules-and-guardrails.md`):
1. No MVP — production-grade for each phase's scope. 2. Event contract from the first commit. 3. Nothing reaches a
learner unverified. 4. **Do NOT build real authentication until I explicitly approve it (Phase 4)** — build the
structure and wiring now. 5. Wobo-cute license: free choreography per page, never alter her identity (molten round
matte jelly, two eyes, the flickering flame). Honour the design system, the motion system, and the consent-tier
gating (un-elevated paths wire zero profiling capabilities). No emoji, no exclamation marks in product copy. Mock
data uses "Northfield International", "Aanya", "Mr. Rao"; never surface the platform-intelligence-layer codename.

API KEYS: I will provide Supabase (URL + anon + service-role) and an Anthropic API key to start; see
`06-TOOLING/01-api-keys-and-env.md`. Keep keys in env/secrets, never in chat or the repo. Do not ask for auth, WhatsApp,
or payment keys yet. Until I provide live LLM keys, run the AI seams in mock mode so the app is still fully walkable.

WORKING RHYTHM: build strictly phase by phase. At the end of Phase 0, produce a phase report (what you built, where
it lives, how to run it, what it emits, what's verified), run the Phase 0 verification checklist
(`05-BUILD-PLAN/06-verification-checklists.md`), open a PR, and then **STOP and wait for my verification** before
Phase 1. Never skip ahead. When a doc is silent on a product decision, ask me — do not invent product, brand, or
architecture decisions. You may freely invent implementation detail and per-page Wobo choreography.

Start with STEP 1 now.
------------------------------------------------------------------------------------------------------
