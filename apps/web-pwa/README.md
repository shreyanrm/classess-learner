# @wobo/web-pwa

The learner app: a Vite + React 19 + TypeScript PWA. Wobo is the runtime the app executes inside
(`CONTEXT.md`, `DESIGN.md` §4) — every screen publishes its own state to Wobo's context bus, and Wobo
reads, draws on and acts in it. Real screens on real data: home, chat, learn, subject, course,
practice, progress, you, plus onboarding and the frame builder.

The design tokens are the law (`@wobo/config`, `DESIGN.md` §2); the UI kit is `src/ui/kit.tsx`;
Wobo's identity, hand and board live in `@wobo/wobo`.

## Run

```bash
bun run --filter @wobo/web-pwa dev
```

Keyless by default: no env means the mock brain and local persistence, and every screen still works.
`DEPLOY.md` lists the `VITE_` variables; `src/vite-env.d.ts` declares them with their real types.

## Scripts

- `dev` — Vite dev server
- `build` — `tsc --noEmit`, then `vite build`
- `preview` — serve the production build
- `typecheck` — `tsc --noEmit` over `src`, `test` and `tests`
- `test` — the bun unit suite (`test/*.test.ts` and the `src` colocated tests)
- `test:e2e` — the Playwright journey suite (`tests/`, chromium, its own dev server on :5199)
- `test:e2e:headed` — the same, with a visible browser
- `test:x-browser` — the cross-browser × responsive matrix (`tests/x-browser.config.ts`,
  chromium + webkit + firefox on :5211; screenshots land in the gitignored `xbrowser/`)

## Two test directories, on purpose

- `test/` — bun tests only. Pure functions and source contracts; no browser.
- `tests/` — Playwright specs only, run by two configs: `playwright.config.ts` (the journey suite,
  which ignores `x-browser.spec.ts`) and `tests/x-browser.config.ts` (the matrix, which matches
  only it).

## What the root filters reach

`bun run typecheck` / `test` / `build` at the repo root are `bun run --filter '*' <script>`, so they
reach every workspace that declares that script: `apps/web-pwa` and `packages/*`
(`config`, `contracts`, `motion`, `sdk`, `wobo`) plus `platform/kgtopg-contract-seed`. They do NOT
run Playwright (`test:e2e` is not named `test`) and they do NOT reach the Python services — those
are `bun run py:lint` / `py:test` at the root.
