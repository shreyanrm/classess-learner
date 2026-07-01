# @classess/web-pwa

Phase 0 app shell for Classess Learner: a Vite + React 19 + TypeScript PWA that boots the
monochrome design spine (design tokens, `@classess/ui`, and Vidya) on deterministic placeholder
data. No product features yet — this proves the chrome, a couple of signature components, and the
Vidya dock wire together.

## Run

```bash
bun run --filter @classess/web-pwa dev
```

## Scripts

- `dev` — start the Vite dev server
- `build` — typecheck (`tsc -b`) then build with Vite
- `preview` — serve the production build
- `typecheck` — `tsc --noEmit`
