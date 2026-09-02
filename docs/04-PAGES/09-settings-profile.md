# 09 · Settings / Profile

**Purpose:** learner-controlled preferences and account shell. **Account/auth UI is the final phase** — build the shell + wiring now.
**Contains:** display name, board/grade, motion/reduced-motion, notification preferences (honest, opt-in), a clear **consent-state view**
(what tier they're in and what it means, in plain language), and a placeholder Account section (sign-in/out, subscription) wired to the
identity + payment seams but not implemented until the final phase.
**States:** view · edit · consent-state(un-elevated/elevated) · account-shell(disabled until auth phase).
**Wobo:** minimal presence here; calm.
**Events:** preference-change events as needed; no PII in domain logic (opaque subject only).
**Guardrails:** plain-language consent transparency; no dark patterns in notification opt-ins; account/auth deferred but seam-ready.
