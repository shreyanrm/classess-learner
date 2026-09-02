# DEPLOY

The runbook for the two production targets. Every step needs the OWNER's
authenticated accounts (Vercel, Railway, Supabase); nothing here runs unattended,
and no secret ever enters this repo.

**Current hosts** (temporary — the app moves to a Wobo domain when the owner buys one):

| Piece | Host | Address |
|---|---|---|
| Web PWA | Vercel | `https://learner.classess.com` (plus the project's default `*.vercel.app` URL) |
| Gateway (the brain) | Railway | `https://classess-learner-production.up.railway.app` |
| Data | Supabase | project ref `keepraxqagzgjrrweryt` |

**Config that is committed:** `vercel.json` (repo root — the only one; Vercel reads
the root file), `railway.json` (repo root), `services/gateway/Dockerfile`,
`infra/supabase/migrations/`, `apps/web-pwa/.env.production` (non-secret flags only).

**Removed deploy targets.** Fly.io and Render were both dead — `classess-gateway.fly.dev`
does not resolve and `classess-gateway.onrender.com` returns 404. `services/gateway/fly.toml`
and `render.yaml` were deleted, and both hosts were dropped from the CSP `connect-src`.
Railway is the single gateway host. `apps/web-pwa/vercel.json` was deleted too: Vercel only
ever read the root file, so the second one was inert config that disagreed with the real one.

---

## 0. Env contract

Everything user-facing is env-driven so the domain swap is one change (see §4).

### Web PWA (Vite). Only `VITE_`-prefixed vars reach the browser — treat every one as public.

| Var | Where it lives | Secret | Production value |
|---|---|---|---|
| `VITE_LLM_MODE` | committed `apps/web-pwa/.env.production` | no | `live` |
| `VITE_PERSIST_MODE` | committed `.env.production` | no | `live` |
| `VITE_DEV_AUTH` | committed `.env.production` | no | `false` — the dev mock identity can never leak |
| `VITE_APP_NAME` | committed `.env.production` | no | `Wobo` (title, PWA manifest name) |
| `VITE_GATEWAY_URL` | committed `.env.production` | no | `https://classess-learner-production.up.railway.app` |
| `VITE_SUPABASE_URL` | committed `.env.production` | no | `https://keepraxqagzgjrrweryt.supabase.co` |
| `VITE_APP_DESCRIPTION` | Vercel project env (optional) | no | unset ⇒ built-in tagline |
| `VITE_APP_URL` | Vercel project env (optional) | no | canonical origin; unset ⇒ no canonical/`og:url` tag |
| `VITE_SUPABASE_ANON_KEY` | **Vercel project env only** | yes-ish | publishable/anon key ONLY — never the service role |
| `VITE_SUPABASE_DEV_JWT` | **never set in production** | yes | dev-only RLS shim |

`apps/web-pwa/.env.production` is committed on purpose and holds **non-secret flags
only**. Without it a production build falls back to dev defaults (mock identity,
local-only persistence) and fails OPEN. Vercel project env overrides it at build
time, which is where every key belongs. The SDK fails fast at boot if
`VITE_DEV_AUTH=false` without the Supabase env, so a misconfigured prod build shows
an error instead of silently shipping dev mode.

### Gateway (Railway service variables — nothing committed).

Every value below is read from the environment; none is hardcoded in service code. Secrets
live only in the Railway service variables and the owner's key vault.

**Identity and consent (Wave 1 — the brain's door).**

| Var | Secret | Where it lives | Production value |
|---|---|---|---|
| `SUPABASE_JWT_SECRET` | **yes** | Railway | the project's JWT secret (HS256 projects). **One of this or the JWKS pair is mandatory when `ENV=prod`** — boot fails without it |
| `SUPABASE_JWKS_URL` | no | Railway | RS256/ES256 projects. Unset ⇒ derived from `SUPABASE_URL` as `<url>/auth/v1/.well-known/jwks.json` |
| `SUPABASE_URL` | no | Railway | `https://keepraxqagzgjrrweryt.supabase.co` — the JWKS base and the consent lookup host |
| `SUPABASE_JWT_AUD` | no | Railway (optional) | `authenticated` (the default) |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | Railway | server-only key for the consent/plan lookup (`learner.profiles_cache` by `subject_id`). Missing ⇒ every learner reads as un-elevated + free |
| `SUPABASE_CONSENT_SCHEMA` / `_TABLE` / `_ID_COLUMN` | no | Railway (optional) | defaults `learner` / `profiles_cache` / `subject_id` — the live schema; set only if the profile moves behind a view |
| `DEV_AUTH` | no | **never in production** | unset. It accepts any asserted identity; `ENV=prod` refuses to boot with it set at all |

**Budget meter and limiter (Wave 1 — the brain owns every number).**

| Var | Secret | Where it lives | Production value |
|---|---|---|---|
| `FREE_DAILY_TURNS` / `FREE_DAILY_GENERATIONS` | no | Railway (optional) | `40` / `8` |
| `ANON_DAILY_TURNS` / `ANON_DAILY_GENERATIONS` | no | Railway (optional) | `6` / `1` — anonymous learners, metered per address |
| `PLUS_DAILY_TURNS` / `PLUS_DAILY_GENERATIONS` | no | Railway (optional) | `400` / `60` — chosen by `profiles_cache.plan` |
| `RATE_LIMIT_PER_MINUTE` | no | Railway | `60` per verified subject |
| `UNAUTH_RATE_LIMIT_PER_MINUTE` | no | Railway | `15` per address for callers with no verified identity |
| `MAX_REQUEST_BYTES` | no | Railway (optional) | `262144` |
| `TRUST_PROXY` | no | Railway | `1` — Railway is our proxy, so the LAST `X-Forwarded-For` hop is the client. Leave unset anywhere the platform does not append that header |

**Brand and mail (the domain swap is these vars, nothing else).**

| Var | Secret | Where it lives | Production value |
|---|---|---|---|
| `APP_NAME` | no | Railway | `Wobo` — product name in prompts, emails, page titles |
| `APP_URL` | no | Railway | canonical web origin. Also the CORS allow-list entry and the base of every email link |
| `APP_PREVIEW_ORIGIN_REGEX` | no | Railway (optional) | CORS regex for our own preview deploys; unset ⇒ the built-in Vercel preview pattern |
| `EMAIL_FROM` | no | Railway | RFC 5322 sender, e.g. `Wobo <wobo@mail.classess.com>`; must be a verified Resend domain |
| `EMAIL_REPLY_TO` | no | Railway | reply-to on every transactional send |
| `EMAIL_UNSUBSCRIBE_URL` | no | Railway (optional) | unset ⇒ `APP_URL/unsubscribe` |
| `EMAIL_POSTAL_ADDRESS` | no | Railway | **owner action.** A real postal address; unset renders a loud placeholder in the footer |
| `EMAIL_MODE` | no | Railway | `console` until the sender domain is verified in Resend, then `live` |
| `RESEND_API_KEY` | **yes** | Railway | from the key vault |
| `INTERNAL_EMAIL_KEY` | **yes** | Railway | the shared key on `X-Classess-Internal`; unset makes `POST /v1/email/send` a dead endpoint (fail closed) |
| `CLSS_GATEWAY_KEY` | **yes** | Railway | internal service key |

**Runtime.**

| Var | Secret | Where it lives | Production value |
|---|---|---|---|
| `ENV` | no | Railway | `prod` |
| `LLM_MODE` | no | Railway | `live` |
| `LOG_LEVEL` | no | Railway | `INFO` |
| `RAILWAY_DOCKERFILE_PATH` | no | Railway | `services/gateway/Dockerfile` (also declared in `railway.json`) |
| `ANTHROPIC_API_KEY` `OPENAI_API_KEY` `GOOGLE_AI_API_KEY` | **yes** | Railway | from the key vault |

`PORT` is injected by Railway; the Dockerfile's `CMD` already honours it. Locally the gateway
runs on **8081** (`uv run uvicorn classess_gateway.app:app --port 8081`), which is what
`.env.example`'s `GATEWAY_URL`, `apps/web-pwa/.env.example` and `apps/web-pwa/.env.development`
all point at.

#### Railway must set — the Wave 1 checklist

Boot fails or a door stands open if any of these is wrong. Check it before every deploy:

- [ ] `ENV=prod` — turns on the prod-only refusals below.
- [ ] `LLM_MODE=live` — with `ANTHROPIC_API_KEY` present, or boot fails.
- [ ] **No `DEV_AUTH`** at any value. `ENV=prod` refuses to start with it set; that refusal is
      the last line of defence, not the plan.
- [ ] Token verification configured: `SUPABASE_JWT_SECRET`, **or** `SUPABASE_JWKS_URL`, **or**
      `SUPABASE_URL` (from which the JWKS URL is derived). `ENV=prod` fails fast without one.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set — otherwise the consent lookup silently answers
      un-elevated + free for everyone, and elevated capabilities are unreachable.
- [ ] `APP_URL` set to the real origin — it is the CORS allow-list, so a wrong value shows the
      browser an opaque network error on every call.
- [ ] `TRUST_PROXY=1` — Railway terminates TLS, so without it the limiter buckets by the proxy.
- [ ] `INTERNAL_EMAIL_KEY` set (or `POST /v1/email/send` stays dead by design).
- [ ] `EMAIL_POSTAL_ADDRESS` set before `EMAIL_MODE=live`.

The full template with comments: `.env.example` (repo root, gateway + shared) and
`apps/web-pwa/.env.example` (web).

---

## 1. Web PWA → Vercel

Production is built **remotely from the repo** by the Vercel git integration. A push
to the deployed branch is the deploy; there is no local build step and no
`vercel deploy` in the normal path. The root `vercel.json` supplies the whole build
(`installCommand`, `buildCommand`, `outputDirectory`, `framework: null`) plus the
SPA rewrite and every security header — no dashboard build configuration is needed,
and dashboard overrides must stay empty so this file remains the single source.

One-time setup:

```sh
vercel login
vercel link                       # link the repo to the project

# Secrets only — the non-secret flags are committed in apps/web-pwa/.env.production:
vercel env add VITE_SUPABASE_ANON_KEY production   # publishable key, never service role

vercel domains add learner.classess.com
```

**DNS (owner action, at the domain's DNS provider):**

```
Type: CNAME   Host: learner   Value: cname.vercel-dns.com
```

Vercel provisions TLS once the CNAME resolves (`vercel domains inspect learner.classess.com`).

Manual deploys are a fallback only (`vercel deploy --prod` from the repo root; the
Hobby plan caps daily CLI deploys, which is why the git integration is the path).
`.vercelignore` applies to CLI uploads only and excludes every `.env` file except
`.env.example` and the committed `apps/web-pwa/.env.production`.

### 1.1 CSP

The one CSP lives in the root `vercel.json`:

```
default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.googleusercontent.com; media-src 'self' data: blob:; worker-src 'self'; manifest-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://classess-learner-production.up.railway.app wss://classess-learner-production.up.railway.app https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

Why each non-obvious source is there — remove one and something breaks silently:

- `'wasm-unsafe-eval'` — RDKit and Pyodide instantiate WebAssembly. Without it every
  chemistry structure and the execution visualiser fail to start.
- `https://cdn.jsdelivr.net` in **both** `script-src` and `connect-src` — Pyodide is
  imported from there (`apps/web-pwa/src/engines/cs/pyodide.ts`) and then fetches its
  own `.wasm` and package archives over `fetch`.
- `data:` in `media-src` — generated narration and video are handed to the player as
  data URIs; without it they mute with no error.
- `fonts.googleapis.com` (`style-src`, `connect-src`) and `fonts.gstatic.com`
  (`font-src`, `connect-src`) — the Plus Jakarta Sans + Caveat stylesheet and its
  font files. These must stay for the type to load.
- the Railway host over `https` **and** `wss` — the gateway plus the
  `/v1/voice/relay` WebSocket.

If the gateway moves, edit that one `connect-src` entry and redeploy.

### 1.2 PWA icons

`apps/web-pwa/public/pwa-{192,512}.png`, `pwa-maskable-512.png` and
`apple-touch-icon.png` are cropped from the wordmark's W-mark. If the logo changes,
regenerate: crop `wobo-logo.png` to the W-mark box, alpha-bbox it, composite centred
on a white square at 72% (52% for maskable), export the four sizes — e.g.
`uv run --with pillow python` and PIL's `crop`/`alpha_composite`/`resize`.

---

## 2. Gateway → Railway

Deployed with `railway up` **from the repo root**: the Docker build needs the whole
uv workspace as its context. Railway builds from `services/gateway/Dockerfile`,
declared two ways — `railway.json` at the repo root (committed, the source of truth)
and the `RAILWAY_DOCKERFILE_PATH` service variable (already set; it takes precedence
and is a safe duplicate).

```sh
railway login
railway link                       # select the project + service

railway variables --set ENV=prod --set LLM_MODE=live --set TRUST_PROXY=1 \
  --set APP_NAME=Wobo --set APP_URL=https://learner.classess.com \
  --set EMAIL_FROM='Wobo <wobo@mail.classess.com>' --set EMAIL_REPLY_TO=hello@mail.classess.com
railway variables --set ANTHROPIC_API_KEY=... --set OPENAI_API_KEY=... --set GOOGLE_AI_API_KEY=...
# The door: one of these must verify a learner token, and the service role key reads the tier.
railway variables --set SUPABASE_URL=https://keepraxqagzgjrrweryt.supabase.co \
  --set SUPABASE_JWT_SECRET=... --set SUPABASE_SERVICE_ROLE_KEY=...
# DEV_AUTH is never set here. ENV=prod refuses to boot with it at any value.

railway up                         # from the repo root
curl -s https://classess-learner-production.up.railway.app/healthz
```

`railway.json` sets the healthcheck to `/healthz`, restarts `ON_FAILURE` (10
retries), and pins **one replica** — the rate limiter and the voice-token store are
in-memory, so a second replica would split them. Move both to Redis before scaling.

**`railway up` uploads the build context, so `.railwayignore` matters.** It excludes
`node_modules`, `apps`, `packages`, screenshots and caches (630 MB → a few MB; the
oversized upload is what made earlier deploys time out mid-transfer), and it excludes
every `.env` file — the gateway takes all values from Railway service variables.

Deploying stale code is the failure mode to watch for: if a fix does not appear,
confirm the deploy actually rebuilt (`railway logs`) before debugging the code.

---

## 3. Supabase → migrations

Project ref `keepraxqagzgjrrweryt`. **The project is currently paused.** Restoring it
is an owner dashboard action (Supabase → project → Restore); nothing else in this
runbook works until it is back, because sign-in and persistence both hang off it.

Migrations in `infra/supabase/migrations/` are the source of truth:

```sh
supabase login
supabase --workdir infra link --project-ref keepraxqagzgjrrweryt
supabase --workdir infra db push     # applies infra/supabase/migrations in order
```

**Auth providers (dashboard, once):** enable Phone (OTP) and Google under
Authentication → Providers, and add the web origin to the redirect allowlist
(Authentication → URL Configuration).

---

## 4. Swapping the domain

When the owner buys the Wobo domain, the swap is a config change, not a code change:

1. `vercel domains add <new-domain>` and point its DNS CNAME at `cname.vercel-dns.com`.
2. Set `VITE_APP_URL=https://<new-domain>` (and `VITE_APP_NAME` if the name changes)
   in the Vercel project env; redeploy. Title, PWA manifest, canonical and `og:` tags
   all follow — `apps/web-pwa/vite.config.ts` reads them, nothing is hardcoded.
3. Set `APP_URL=https://<new-domain>` (plus `APP_NAME`, `EMAIL_FROM`, `EMAIL_REPLY_TO`,
   and `EMAIL_UNSUBSCRIBE_URL` if it is not `APP_URL/unsubscribe`) on the Railway service.
   This is also the CORS allow-list entry and the base of every email link. The gateway reads
   all of them from the environment as of Wave 1 — no code change is involved.
4. If the gateway also moves, edit the one `connect-src` host pair in `vercel.json`.
5. Verify the new sender domain in Resend before flipping `EMAIL_MODE=live`.

---

## 5. Smoke checklist (after all three)

```sh
curl -sI https://learner.classess.com | grep -iE 'content-security|strict-transport'
curl -s https://classess-learner-production.up.railway.app/healthz
```

- [ ] **No CSP violations** — open the console on a page that renders a chemistry
      structure and one that runs the execution visualiser; zero `Refused to …` lines.
- [ ] **Fonts** — Plus Jakarta Sans and Caveat render (not the fallback stack).
- [ ] **Auth round-trip** — fresh browser → onboarding sign-in beat → phone OTP (or
      Google) → lands home; You → sign out → back to onboarding.
- [ ] **Wobo turn live** — ask something about the current screen → a grounded
      (non-canned) reply; `railway logs` shows the capability invoke.
- [ ] **Voice session** — mic prompt → speak → she answers (WS `/v1/voice/relay`;
      needs `GOOGLE_AI_API_KEY` on the gateway).
- [ ] **Media** — a generated narration actually plays (proves `media-src data:`).
- [ ] **Events landing** — Supabase SQL editor:
      `select * from learner.outbox order by created_at desc limit 10;` — new rows,
      each attributed (app / subject / purpose / consent), drained to `platform.events`.
- [ ] **Persistence** — earn XP, reload → state survives (`learner.learner_state` updated).
- [ ] **PWA** — install from the browser menu → correct icon, standalone window;
      airplane-mode reload still serves the shell.
- [ ] **No dev leaks** — view-source has no localhost URL; `VITE_SUPABASE_DEV_JWT`
      absent from `vercel env ls production`.
