# 00 · Tooling — Skills, MCPs, Plugins (activate and use)

Use everything Claude Code is powered with. Prefer the right tool over hand-rolling. Below is what to use and for what.

## MCPs
- **Supabase MCP (confirmed available)** — use directly for: creating/applying migrations, writing & testing **RLS policies**,
  inspecting schema, running SQL, managing Storage buckets, enabling pgvector. All Phase 0/1 database work goes through it.
  Do NOT hand-write raw SQL files when the MCP can apply and verify them.
- **GitHub** — repo creation/management; lift the **contract layer** from `shreyanrm/classess-school` (TAKE list in
  `01-ARCHITECTURE/02-kgtopg-contract-seed.md`); branch-per-phase; open PRs at each gate for Shreyan to review.
- Any **filesystem / terminal** access — run the monorepo, tests, typecheck, the dev server, the gateway/verifier services locally.
- If a **web/fetch** tool is available — use it to pull current library docs (Expo, Supabase, LiteLLM, FSRS, JSXGraph, Mafs, R3F,
  Remotion, Razorpay) rather than relying on memory; pin versions.

## Skills (use whichever are installed; map to the work)
- **Frontend / design-system / UI skills** — building `/packages/ui`, the surfaces, accessibility, responsive. Honour our tokens
  (`02-DESIGN/`) over any skill's defaults.
- **Architecture / system-design skills** — Phase 0 spine, the event contract, service boundaries, ADRs for any real decision.
- **Testing-strategy skills** — the test plan for the contract layer, verifier, orchestrator policy, gateway routing, RLS.
- **Code-review / debug skills** — at each phase gate before requesting verification.
- **Data / SQL skills** — schema + RLS design alongside the Supabase MCP.
- **Documentation skills** — phase reports and run instructions at each gate.

## Plugins
- Activate the project/engineering plugins available (architecture, testing, code-review, documentation, design). Use them to keep
  each phase production-grade and to generate the phase reports + checklists.

## How to use them well
- **Read this whole `/docs` suite first** (START-HERE → 00 → 06). It overrides tool defaults on every product/brand/architecture decision.
- Use MCPs for real side effects (DB, repo), skills for method, plugins for rigor. When a tool default conflicts with a doc, **the doc wins**.
- At every phase gate: run tests, run the verification checklist, open a PR / produce a phase report, then **stop for Shreyan**.
