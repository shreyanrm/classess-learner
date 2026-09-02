# 07 · Mock-First Build Posture (build it walkable, then make it live)

> This resolves how to honour BOTH "no MVP / production-grade" AND "build with mock data first to understand the app."
> They are not in conflict when you split **architecture** from **data/providers**.

## The principle
- **Architecture is production-grade from line one** (non-negotiable): the event contract, RLS, the gateway, the verifier, typed
  contracts, the identity boundary. None of this is ever mocked or stubbed-for-real.
- **Data and external providers start MOCKED behind typed seams**, so the entire app is **walkable and understandable** — you and Claude
  Code can click through every flow on deterministic seed data — *before* anything external is wired.
- Then each seam is **flipped from mock → live** progressively, ending **production-ready and launchable.**

So: **mock the data and the outside world; never mock the spine.**

## What is mocked first vs live later (the seam table)
| Seam | Mock-first (build + understand) | Live (production-ready) | Flips at |
|---|---|---|---|
| Identity / auth | dev mock user, `DEV_AUTH=true` | Supabase Auth (phone OTP) | Phase 4 |
| KGtoPG governed views | in-repo reference implementation + seed | real platform services | as platform matures |
| Content / Plexus | **seeded verified content cache** (atom) | live generate→verify→cache on miss | Phase 1→3 |
| LLM providers (Track 1) | recorded/deterministic mock responses | real Anthropic/Gemini/OpenAI via gateway | when proving the atom |
| Wobo perception | replayed sample working + transcripts | live event/state-stream perception | Phase 1 (the spike) |
| WhatsApp (parent) | rendered digest preview, no send | WhatsApp Cloud API send | Phase 2→3 |
| Email / push | console/preview | Resend / push provider | Phase 2→3 |
| Payments | mock subscription state | Razorpay / IAP | Phase 4 |
| Parental consent | mock elevation toggle (dev) | DigiLocker-grade verification | Phase 4 |

## Rules for mock-first
- **Every mock sits behind the same typed interface as its live version.** Flipping to live is changing a provider binding + an env
  flag, never a refactor. (e.g. `ContentProvider`, `LLMProvider`, `IdentityProvider`, `MessagingProvider`, `PaymentProvider`.)
- **Feature flags / env** select mock vs live per seam (`DEV_AUTH`, `LLM_MODE=mock|live`, `CONTENT_MODE=seed|live`, `WHATSAPP_MODE`, …).
- **Seed data is deterministic and realistic** (uses "Northfield International", "Aanya", "Mr. Rao"; ₹999 / ₹8,999). A learner can be
  walked from onboarding → atom → mastery → ignite → parent digest entirely on seed data.
- **Mocks still emit real events** through the real event contract. The spine is exercised even in mock mode.
- **The verifier is never mocked** — even seeded content must have passed it; even mock LLM responses for content go through the gate.

## The build arc, restated
1. **Walkable on mock** — the whole atom experience runs on seed data + mock providers; you can see and understand it.
2. **Flip the intelligence live** — real LLMs through the gateway, live Wobo perception, live generate→verify→cache (still narrow content).
3. **Flip the rest live, harden, launch** — WhatsApp/email/push, then (Phase 4) auth + consent + payments → production-ready & releasable.
