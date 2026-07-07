# DEPLOY — learner.classess.com

One-command-ready runbook. Every step below needs the OWNER's authenticated accounts
(Vercel, Fly.io or Render, Supabase) — nothing here runs unattended, and no secret
ever enters this repo. Config that is already committed: `vercel.json` (repo root),
`services/gateway/fly.toml`, `render.yaml`, `infra/supabase/migrations/`,
`apps/web-pwa/.env.production` (non-secret flags only).

## 0. Env matrix

| Var | Where it lives | Production value |
|---|---|---|
| `VITE_LLM_MODE` | committed `.env.production` | `live` |
| `VITE_DEV_AUTH` | committed `.env.production` | `false` (dev mock identity can never leak) |
| `VITE_PERSIST_MODE` | committed `.env.production` | `live` |
| `VITE_GATEWAY_URL` | Vercel project env | `https://classess-gateway.fly.dev` (or `…onrender.com`) |
| `VITE_SUPABASE_URL` | Vercel project env | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Vercel project env | publishable key ONLY — never service role |
| `VITE_SUPABASE_DEV_JWT` | **never set in prod** | dev-only RLS shim |
| `LLM_MODE`, `ENV` | gateway host (fly.toml / render.yaml) | `live`, `prod` |
| `ANTHROPIC_API_KEY` `OPENAI_API_KEY` `GOOGLE_AI_API_KEY` | gateway host secrets | from the key vault |

The SDK fails fast at boot if `VITE_DEV_AUTH=false` without the Supabase env — a
misconfigured prod build shows an error instead of silently shipping dev mode.

## 1. Web PWA → Vercel

From the **repo root** (the root `vercel.json` builds `apps/web-pwa` inside the bun
workspace — no dashboard configuration needed):

```sh
vercel login
vercel link                      # create/link project (e.g. "classess-learner")

# Production env (each prompts for the value; paste from your vault):
vercel env add VITE_GATEWAY_URL production      # https://classess-gateway.fly.dev
vercel env add VITE_SUPABASE_URL production     # https://<project-ref>.supabase.co
vercel env add VITE_SUPABASE_ANON_KEY production

vercel deploy --prod
vercel domains add learner.classess.com         # attaches the domain to this project
```

**DNS (owner action, at the classess.com DNS provider):**

```
Type: CNAME   Host: learner   Value: cname.vercel-dns.com
```

Vercel provisions TLS automatically once the CNAME resolves (`vercel domains inspect
learner.classess.com` to check).

### 1.1 CSP note

`vercel.json` locks `connect-src` to `*.supabase.co` plus **both** default gateway
hosts (`classess-gateway.fly.dev`, `classess-gateway.onrender.com`, https + wss). If
the gateway gets a custom domain, edit that line and redeploy.

### 1.2 PWA icons

`apps/web-pwa/public/pwa-{192,512}.png`, `pwa-maskable-512.png`, and
`apple-touch-icon.png` are cropped from the wordmark's C-mark. If the logo changes,
regenerate: crop `classess-logo.png` to `(0, 0, 109, 200)` (C + sparkles), alpha-bbox
it, composite centered on a white square at 72% (52% for maskable), export the four
sizes — e.g. `uv run --with pillow python` and PIL's `crop`/`alpha_composite`/`resize`.

## 2. Gateway → Fly.io (or Render)

### Fly (primary)

From the **repo root** (the Docker build needs the uv workspace as context):

```sh
fly auth login
fly apps create classess-gateway
fly secrets set -a classess-gateway \
  ANTHROPIC_API_KEY=... OPENAI_API_KEY=... GOOGLE_AI_API_KEY=... \
  LLM_MODE=live                      # secrets override fly.toml's mock default
fly deploy -c services/gateway/fly.toml .
curl -s https://classess-gateway.fly.dev/healthz
```

`fly.toml` already pins `ENV=prod` (CORS locks to https://learner.classess.com),
WebSockets pass through natively (`/v1/voice/relay`), and a single machine keeps the
in-memory rate limiter coherent.

### Render (alternative — one host at a time)

```sh
render login
render blueprints launch             # picks up render.yaml at the repo root
```

Then in the Render dashboard: set `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` /
`GOOGLE_AI_API_KEY` (declared `sync: false`), flip `LLM_MODE` to `live`, deploy. If
Render is the host, set `VITE_GATEWAY_URL=https://classess-gateway.onrender.com` in
Vercel instead.

## 3. Supabase → migrations

Project: **canonical** (`keepraxqagzgjrrweryt`). Migrations in
`infra/supabase/migrations/` are the source of truth (applied via the Supabase
MCP or the CLI, which reproduces the same state):

```sh
supabase login
supabase --workdir infra link --project-ref keepraxqagzgjrrweryt
supabase --workdir infra db push     # applies infra/supabase/migrations in order
```

**Auth providers (dashboard, once):** enable Phone (OTP) and Google under
Authentication → Providers, and add `https://learner.classess.com` to the redirect
allowlist (Authentication → URL Configuration).

## 4. Smoke checklist (after all three deploys)

```sh
curl -sI https://learner.classess.com | grep -iE 'content-security|strict-transport'
curl -s https://classess-gateway.fly.dev/healthz
```

- [ ] **Auth round-trip** — fresh browser → onboarding sign-in beat → phone OTP (or
      Google) → lands home; You → sign out → back to onboarding.
- [ ] **Vidya turn live** — open Vidya, ask something about the current screen → a
      grounded (non-canned) reply; `fly logs -a classess-gateway` shows the
      capability invoke.
- [ ] **Voice session** — mic permission prompt → speak → she answers (WS
      `/v1/voice/relay`; requires `GOOGLE_AI_API_KEY` on the gateway).
- [ ] **Events landing** — Supabase SQL editor:
      `select * from learner.outbox order by created_at desc limit 10;` — new rows
      from the session, each attributed (app / subject / purpose / consent), and the
      relay drains them to `platform.events`.
- [ ] **Persistence** — earn XP, reload → state survives (row in
      `learner.learner_state` updated).
- [ ] **PWA** — install from the browser menu → C-mark icon, standalone window;
      airplane-mode reload still serves the shell.
- [ ] **No dev leaks** — view-source has no localhost URL; `VITE_SUPABASE_DEV_JWT`
      absent from `vercel env ls production`.
