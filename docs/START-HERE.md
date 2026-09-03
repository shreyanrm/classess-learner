# Wobo — Build Documentation Suite

> This folder is the **single source of truth** for building Wobo end to end.
> Read it in order. Do not improvise outside it except where a doc explicitly grants license.

## What this is
Wobo is a B2C, AI-native consumer learning app — the flagship consumer product of the Classess
ecosystem, and the reference implementation of the **Dot eVentures education ecosystem**. The
ecosystem is the entity; **KGtoPG** (the governed identity + data + intelligence platform) and
**Wobo** are both citizens of it.
The app is built to plug into KGtoPG correctly, proving the pattern every future product follows. Wobo is also the name of the tutor who lives in the app; in these docs "Wobo" means the tutor. Wobo has no gender: use the name, and they/them only when a pronoun is unavoidable.

North star: *"Brilliant.org, but AI-native, built for India, premium, with mechanics nobody in edtech has shipped."*
Governing frame: **cognitive fitness — a gym for the mind**, not edtech.

## How to read this suite (in order)
1. `00-CONTEXT/` — what we're building, the locked product stances, the glossary, and the hard rules.
2. `01-ARCHITECTURE/` — system shape, the event contract, KGtoPG seed, Supabase, the AI fabric, the stack & conventions.
3. `02-DESIGN/` — the design system, the motion system, Wobo, components, icons.
4. `03-FLOWS/` — the "neural network" of the app: every flow as **when / where / what / why / how**, with events + AI.
5. `04-PAGES/` — the page inventory and per-surface specs.
6. `05-BUILD-PLAN/` — the phased plan with verification checklists. **Build in this order. Do not skip phases.**
7. `06-TOOLING/` — which skills, MCPs, and plugins to activate, and how.

## The five rules that override everything (full text in `00-CONTEXT/03-rules-and-guardrails.md`)
1. **No MVP.** Production-grade from line one. No stubs on the critical path, no "later" on the contract.
2. **Event contract from the first commit.** Every meaningful action emits a clean, attributed event. Non-negotiable.
3. **Correctness is existential.** No generated content reaches a learner unverified. A wrong answer to a child is a failure.
4. **Auth is built LAST, on explicit approval.** Build the structure and wiring now; do not implement real auth until told.
5. **Wobo-cute license.** Within the locked Wobo system, you have creative freedom to make Wobo delightful per page. Never alter Wobo's identity.

## Working posture for Claude Code
- Work **phase by phase**. At each phase gate, stop, summarize what you built, and wait for verification.
- Before building a phase, **produce a short plan** and confirm it against the relevant docs.
- Build **production-grade**: typed, tested where it matters, accessible, responsive, observable.
- When a doc and your instinct conflict, the **doc wins**. If a doc is missing detail, ask — do not invent product decisions.
- You may freely invent **implementation detail and per-page Wobo choreography**; you may not invent **product, brand, or architecture decisions**.

---

## Additions (v1.1)
- **`Wobo-Master-Document.pdf`** is included at the folder root — the full narrative vision behind these terse build docs.
  Read it after `00-CONTEXT/` for complete context; the build docs override it where they are more specific.
- **`01-ARCHITECTURE/06-content-and-courses.md`** — where teaching content comes from (Plexus, catalogs, the verifier-gated cache, and
  exactly what to seed for the atom).
- **`05-BUILD-PLAN/07-mock-first-build-posture.md`** — **build the app fully walkable on mock/seed data first** (so it can be seen and
  understood), then flip each seam mock → live, ending production-ready and launchable. Mock the data and the outside world; never mock the spine.
- **`06-TOOLING/01-api-keys-and-env.md`** — which API keys to hand over and when (short version: Supabase + Anthropic now; the rest later).
