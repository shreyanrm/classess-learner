# 00 · Page / Surface Inventory

Surfaces are built production-grade, but **in build-plan order** (foundation + atom first, breadth later). Every surface: all states,
a11y, responsive (mobile-first, PWA parity), motion-aware, consent-tier-aware, emits its events, uses the identity abstraction (no auth assumptions).

## Primary navigation (learner)
- **Today** — the ritual home. One clear next action, the meter, today's win, the constellation peeking. (Next-best-action, not a feed.)
- **Learn** — the node loop surface (opener + canvas + Wobo + reveal). The heart.
- **Create** — the create-anything door.
- **Progress** — the constellation map + knowledge-twin queries.
- **Wobo** is not a tab — Wobo is **present across all surfaces** (floating presence + panel), choreographed per page (cute license).

## Supporting surfaces
- **Onboarding** (door, age-branch, goal, diagnostic, aha node).
- **Practice** (unaided evidence; reached from Learn/Today/FSRS due).
- **Meter / Conversion** moments (frost sheet + contextual offers).
- **Parent** companion (WhatsApp-first; in-app link/consent screen).
- **Settings / Profile** (display prefs, board/grade, consent state view, account — account/auth UI is final phase; build the shell).
- **System states**: offline, locked-node, error, empty, loading — as shared patterns, not per-page reinventions.

## Per-surface spec files
- `01-today.md`, `02-learn.md`, `03-create.md`, `04-progress.md`, `05-practice.md`, `06-onboarding.md`,
  `07-meter-conversion.md`, `08-parent.md`, `09-settings-profile.md`.
Surfaces beyond the atom (full subject breadth, exam surfaces, social/belonging) are built in Phase 3 following these same patterns;
specs for them are extended at that phase from the flows + this inventory. Do not build them before the atom is proven.
