# Phase 4 · Auth & Launch (LAST — only on Shreyan's explicit approval)

**Do not start any of this until Shreyan says go.** Everything was built auth-ready; this phase wires the real thing with near-zero refactor.

## Build
1. **Supabase Auth** (phone OTP): flip `DEV_AUTH=false`, point the identity abstraction at the real session; verify all RLS policies under
   real `auth.uid()`. The mock user disappears; nothing else should need to change structurally.
2. **Verifiable parental consent (DigiLocker-grade)** + **consent-tier elevation** flow (DPDP): real parent identity + parent-child
   relationship verification, immutable consent record, tier elevation event. Implement the un-elevated→elevated transition end to end.
3. **Payments:** Razorpay + native IAP for the single premium plan (Superstar, ₹999/mo · ₹8,999/yr). Subscription lifecycle, restore,
   honest billing (cancel-anytime, no EMI dark patterns, no surprise charges — trust-as-a-feature).
4. **Production hardening:** rate limits, abuse/cost ceilings live, observability/alerting, privacy/data-rights flows (export/delete),
   security review, load.
5. **Store submission** (App Store / Play) + PWA production deploy.

## Gate
Final phase report + Phase 4 checklist + a full pre-launch verification. Launch decision is Shreyan's.
