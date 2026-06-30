# 00 · Design System (Classess Learner)

## The governing idea
**Black and white is the world before you understand something. Color is what understanding looks like.**
- **Black/white = architecture:** chrome, type, canvas, structure are monochrome.
- **Color = content/meaning:** color belongs to concepts and is **earned** (the *ignite* moment), never used as decoration.
- **No signature brand hue.** The brand is the *behaviour of color*, not a color. (The one exception: **Vidya owns molten** as her identity — see Vidya doc.)

## Tokens (define once in `/packages/config`, consume everywhere)

### Base (neutral, true black & white — no warm/clay tints)
```
--ink-900:#0A0A0B  --ink-800:#161617  --ink-700:#2A2A2C  --ink-500:#6B6B70
--ink-300:#B8B8BD  --ink-100:#E9E9EC  --paper:#FFFFFF    --canvas:#FAFAFA
```
Dark surfaces step tonally (no shadows): `--surface-1 … --surface-4` as small lightness steps.

### Content-color playground (earned; one hue per concept/subject — 15 accents)
```
Cobalt #1E6BFF · Indigo #4B41E0 · Violet #7A2FF2 · Grape #A82FE0 · Magenta #DD1E9A · Rose #F4356E ·
Hot Red #EC1C2D · Molten #FF4D1A · Tangerine #FF8A00 · Amber #FFB020 · Acid #C2F000 · Emerald #10A37A ·
Tiffany #0FC2C0 · Cyan #00B5D8 · (one open slot for future subject)
```
Each subject/concept is assigned one accent; that hue is what its nodes *ignite* into.
**Molten #FF4D1A is reserved for Vidya** — do not assign it as a subject accent.

### Type
- **Display + system:** Google Sans Flex (weights 300–700). Web stand-in: Plus Jakarta Sans until licensed.
- **Handwritten/human:** Caveat — Vidya's annotations, margin notes, "thinking out loud" marks. Use generously but purposefully.
- **No monospace in product UI.**
- Scale (fluid): display / h1 / h2 / h3 / body-lg / body / caption. Sentence case everywhere. Generous line-height.

### Shape & depth
- **Corners: radius-sm = 2px default** (subtle, not boxy); larger radii only for Vidya's jelly and her panel.
- **No drop shadows anywhere.** Depth via: 0.5px hairlines (`--ink-100` on paper, low-alpha white on dark), tonal surface steps,
  and **frost** (backdrop blur) — frost is used **only on overlays** (Vidya's panel, modals, the meter sheet).

### Spacing
- European-spacey: generous whitespace, calm density. An 8px base grid; sections breathe. Not cramped, not Korean-dense.

## Application rules
- A learner's first view of new material is **monochrome**. Progress lights it up. The home/progress surfaces visibly gain color
  as mastery grows — the map of a mind turning on.
- Accent color is allowed on: a mastered node, an active ignite, a subject's identity, data viz tied to real mastery. **Not** on
  buttons-for-emphasis, decorative gradients, or empty chrome.
- Accessibility: never encode meaning in color alone (bands also carry label + shape); maintain WCAG AA contrast on all text.
