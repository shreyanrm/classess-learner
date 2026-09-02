export const meta = {
  name: 'wave6-production',
  description: 'Production readiness: real auth, Supabase persistence, gateway hosting, Vercel deploy to learner.classess.com',
  phases: [{ title: 'Persist' }, { title: 'Auth' }, { title: 'Ship' }],
}
const PRE = `Read CONTEXT.md §5 §14, the fleet brief, and .env.example. Supabase project exists (SUPABASE_URL/keys in .env.local, migrations in infra/supabase). NOTHING dev-mode may leak to prod: secrets only via env, dummy data only, events attributed. MISSION:\n`
const R = { type: 'object', properties: { built: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, typecheck: { type: 'string' }, unfinished: { type: 'string' } }, required: ['built', 'files', 'typecheck', 'unfinished'] }

phase('Persist')
const persist = await parallel([
  () => agent(PRE + `Own packages/sdk persistence seams + infra/supabase. Wire the REAL stores: events → Supabase outbox table (batch insert via the existing relay pattern, replacing InMemoryEventProvider in live mode), progress/XP/topicProgress/mind → a learner_state table (merge on write, hydrate on boot, localStorage stays as offline cache with reconciliation), Wobo conversation → learner_threads. Additive migrations only; RLS on every table keyed to auth.uid(); keep mock mode fully working keyless. Tests for the reconciliation logic.`, { label: 'supabase-persist', phase: 'Persist', schema: R }),
  () => agent(PRE + `Own services/gateway deployment packaging: Dockerfile (uv-based, uvicorn, healthcheck), fly.toml AND render.yaml (either host works; WS support required for /v1/voice/relay), CORS locked to https://learner.classess.com + localhost dev, rate limiting on capability routes (slowapi or middleware, per-IP), env validation on boot (fail fast if LLM_MODE=live without keys), structured logging. Keep tests green.`, { label: 'gateway-ship', phase: 'Persist', schema: R }),
])

phase('Auth')
const auth = await agent(PRE + `Own packages/sdk/src/identity.ts live implementation + apps/web-pwa auth surfaces. Implement Supabase Auth: phone-OTP-first + Google, replacing DevMockIdentity in live mode (config.devAuth=false path): session → subject_id mapping (auth.uid as the canonical id seam), onboarding gains the sign-in beat (phone number → OTP → verified, or Google one-tap; the flow stays HER flow — Wobo introduces sign-in warmly, no generic auth wall), sign-out in You settings works, consent tier stays un_elevated until parental consent exists. Guard: unauthenticated in live mode → onboarding. Mock mode untouched for dev. Typecheck + biome.`, { label: 'real-auth', phase: 'Auth', schema: R })

phase('Ship')
const ship = await agent(PRE + `Own the deploy config: vercel.json for apps/web-pwa (SPA rewrites, security headers incl. CSP allowing the gateway origin + Supabase, immutable asset caching), production env plumbing (VITE_LLM_MODE=live, VITE_GATEWAY_URL from env), PWA manifest + icons from the logo asset, robots.txt, and a DEPLOY.md runbook: exact commands for (1) vercel link+deploy+domain add learner.classess.com (DNS CNAME the owner must set), (2) gateway deploy to Fly/Render with secrets, (3) supabase migration push, (4) smoke checklist (wobo turn live, voice session, events landing in Supabase, auth round-trip). Do NOT run the actual deploys (owner must authenticate accounts) — make everything one-command ready. Verify local prod build: bun run build + vite preview smoke.`, { label: 'vercel-ship', phase: 'Ship', schema: R })
return { persist, auth, ship }
