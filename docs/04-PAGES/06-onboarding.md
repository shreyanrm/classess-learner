# 06 · Onboarding

**Purpose:** frictionless entry → age-branch (DPDP) → aspirational goal → diagnostic → a real win in ≤60s (see `03-FLOWS/01-onboarding-flow.md`).
**Contains:** door choice (template/create) · age+grade+country capture (sets consent_tier default) · goal (shown back as the next-self) ·
micro-diagnostic (adaptive, places on graph, pre-lights map) · the aha node.
**States:** door · age-branch(18+/under-18) · goal · diagnostic · aha-node · (no login — dev mock; auth UI is final phase).
**Vidya:** a brief, warm greeting then steps back so the first win is the learner's; small settle-in, soft flame.
**Events:** `session.started.v1`, `onboarding.*`, `identity.subject.created.v1`(mock), `learn.node.entered.v1`.
**AI:** `orchestrator.place` · `mastery.getNextBestNode` · `generate.opener`(verified) · brief `vidya.turn`.
**Guardrails:** no behavioural profiling pre-consent; the aha is a real win, content-engineered not behaviourally targeted; calm copy.
