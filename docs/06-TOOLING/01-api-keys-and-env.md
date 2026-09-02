# 01 · API Keys & Environment (what to hand Claude Code, and when)

## Handling rules (read first)
- **Never paste real keys into chat or commit them to the repo.** Put them in the secrets manager / `.env` (gitignored). Infisical is the
  intended secrets store; `.env.local` is fine for early dev.
- **Internal key naming convention:** `clss.<app>.<env>.<purpose>` (e.g. `clss.learner.dev.gateway`).
- Give Claude Code keys **per phase** — it does not need launch/auth/payment keys to build and walk the app.

## NEEDED NOW — to build + walk the app (Phases 0–2, mock-first)
- **Supabase** (you have the project + the Supabase MCP):
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (service role for migrations/RLS via the MCP; keep server-side only).
- **At least one Track-1 LLM provider** (for when the atom flips from mock → live AI; can stay mocked at first):
  - `ANTHROPIC_API_KEY` (primary; powers Wobo/generation/grading via the gateway). **Minimum required to go live on the atom.**
  - Optional now, useful soon: `GOOGLE_AI_API_KEY` (Gemini), `OPENAI_API_KEY` — for per-capability routing + second-model cross-checks.
- **LiteLLM** (the gateway) — no key of its own; it uses the provider keys above.
- **Observability (recommended, optional):** `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` (LLM cost/latency/quality), `SENTRY_DSN`.

That's the whole list to build, walk, and prove the atom: **Supabase (3) + Anthropic (1)**, plus optional Gemini/OpenAI/Langfuse/Sentry.

## NEEDED SOON — when these surfaces go live (Phase 2–3)
- **WhatsApp Cloud API** (parent surface as a real channel): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (Meta). Mock the send until then.
- **Email:** `RESEND_API_KEY`. **Push:** Knock/OneSignal keys. Mock/console until then.

## NEEDED LAST — Phase 4 only (auth + consent + payments + launch)
- **Supabase phone-auth SMS provider** (Supabase phone OTP needs an SMS provider, e.g. MSG91/Twilio): that provider's credentials.
- **Parental consent verification** (DigiLocker-grade): the verification provider credentials.
- **Payments:** `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`; Apple/Google IAP credentials.
- Do not obtain or wire these until you approve Phase 4.

## Summary you can act on
- **Hand Claude Code now:** Supabase URL + anon + service-role, and your Anthropic API key. (Add Gemini/OpenAI/Langfuse if you have them.)
- **Hold until later:** WhatsApp, Resend/push (Phase 2–3); SMS-for-OTP, DigiLocker, Razorpay/IAP (Phase 4).
