# 03 · Component System

Build in `/packages/ui`. Every component: typed props, all states, a11y, responsive, motion-aware, token-driven, no shadows.

## Primitives
Button (primary/secondary/ghost; magnetic on primary), IconButton, Input/TextArea (calm, hairline border, 2px radius),
Select, Toggle, Tabs, Card (tilt-capable), Sheet/Modal (frost + blur-in), Tooltip, Toast (no exclamation copy),
Skeleton (tonal shimmer), ProgressBar (spring-bars), Badge.

## Domain components
- **ConceptTile** — the monochrome→ignite unit. States: locked / not-started / in-progress / mastered (ignited to accent).
- **MasteryBand** — band as label + shape + (earned) color; never color alone. Bands: not-started/emerging/developing/secure/independent.
- **OpenerCard** — the active "pose" of pose→struggle→reveal. Holds an interactive prompt (JSXGraph/Mafs/custom), submit, attempt history.
- **RevealPanel** — the fading reveal (Vidya annotation / nugget video / reading), only after a struggle.
- **CanvasSurface** — the shared working canvas Vidya perceives (expression input / strokes); emits canvas events.
- **PracticeItem** — FSRS-scheduled retrieval item; independence-aware (records aided vs unaided).
- **ConstellationMap** — the prerequisite-graph view; nodes monochrome until mastered, edges carry constellation-ignite.
- **MeterSheet** — the daily behavioural budget surface (frost sheet); shows concepts-mastered budget, never a raw clock.
- **VidyaPresence** + **VidyaPanel** — from `/packages/vidya`; the presence (floating jelly + flame) and the frosted panel.
- **ParentDigestCard** — pride-first weekly artifact (used in the parent/WhatsApp surface generation).

## States to never skip
loading · empty · error · offline · locked (pre-req not met) · aided vs unaided · un-elevated vs elevated (consent) · reduced-motion.
