# 01 · Motion System (a designed language — not left to per-screen improvisation)

Motion is a **named, shared library** in `/packages/motion`. Build these primitives once; screens compose them. GPU-friendly
(transform/opacity), eased, **always meaningful, never decorative**. Respect `prefers-reduced-motion` (provide calm equivalents).

## Signature motions (the two that define the brand)
- **ignite** *(primary signature)* — a concept floods from monochrome to its content-color. Sequence: desaturated → a bloom of
  color radiating from the point of mastery → settle, with a soft warm light pulse. This is the emotional payload of the whole app;
  make it feel *earned and physical*, ~600–900ms, never gratuitous.
- **constellation-ignite** *(second signature)* — when a node is mastered, light travels along the **prerequisite graph** to the
  nodes it unlocks: they pulse/brighten in sequence (stagger down edges). The visible "my mind is wiring up" moment.

## Core primitives
- **spotlight** — focus pulls to one element; surroundings dim/recede (tonal, no shadow).
- **tilt-3D** — subtle parallax tilt on interactive cards (pointer/gyro), small angles.
- **spotlight × tilt (showpiece)** — the merged hero treatment for featured cards/moments. Reserve for key surfaces.
- **magnetic** — primary actions subtly attract the cursor/thumb target; gentle.
- **ripple** — tactile feedback from the point of contact (monochrome).
- **reveal** — content fades/rises in on entrance (the "fading reveal" after a struggle).
- **stagger** — lists/grids resolve in sequence, not all at once.
- **blur-in** — frost/defocus → focus for overlays (pairs with frost depth).
- **count-up** — numbers animate to value (mastery %, streak, capacity) — only real numbers.
- **spring-bars** — progress/mastery bars settle with a single calm spring (no bounce-fest).

## Annotation kit (Caveat, hand-drawn — use generously)
A library of hand-drawn marks Wobo and the system draw onto the canvas: underline, circle, arrow, bracket, check, cross-out,
"look here" tick. Drawn as if by hand (path-draw animation), in Caveat where text. These make the experience feel human and tutored.

## Rules
- Every motion must carry meaning (focus, feedback, progress, causality). If it is only pretty, cut it.
- Timing: micro 120–200ms, standard 240–360ms, signature 600–900ms. Consistent easing tokens in `/packages/config`.
- No drop shadows in motion either — depth shifts use tone, hairline, frost.
