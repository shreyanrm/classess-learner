# VIDEO-QUALITY.md — the visual-quality doctrine for the motion engine

Companion to `DESIGN.md` (§5, §9) and `MOTION.md`. Governs every explainer the `video` engine
storyboards and `MotionPlayer.tsx` plays. Our videos are **self-animating inline SVG scenes**, not
rendered MP4s — so "quality" here is composition, restraint, and choreography a storyboard prompt can
enforce, frame by frame.

The bar was set by a reference titration film (see `vidref-1/2/3.png`): a Class-10 chemistry piece,
ink line-work on warm paper, a single ochre hue carrying the reagent and the data, a high-contrast
serif narrating over instrument-style mono labels, one idea per beat, and a pH-curve "cliff" as the
reveal. **Inspiration, never replication** (standing law): we take its principles into the Classess
language — pure white paper, our ink scale, our subject hues, Fraunces + JetBrains Mono — never its
cream-and-ochre skin.

---

## 1. The frame test — what "premium" means per paused frame

Pause on any frame. It must read as a **museum-grade editorial diagram**, not a slide. It passes only if:

- **≤ 7 distinct marks** on screen (a multi-stroke apparatus counts as ONE mark if it reads as one object).
- **One hue.** Everything else is ink line-work on white.
- **Deep margins.** ≥ 8% safe margin on all sides; negative space dominates; one focal subject, not a full canvas.
- **Exactly two type voices** — editorial serif (the one headline) + tracked mono (every label). No third.
- **One hairline weight** across all line-work (stroke-width 1.5 on the 640×360 grid).
- **Alignment.** The subject sits on a third; the headline rides the upper third; a readout parks in a fixed corner.

If a paused frame looks like "a title with bullets underneath," or like a stock-photo slide, it has failed — redraw it.

## 2. Composition grid

- **viewBox `0 0 640 360`** (16:9) for every scene — one canvas so cuts feel like one film.
- **Safe area:** keep meaning inside x∈[52,588], y∈[28,332]. Bleed only atmosphere, never text or the subject.
- **Zones (fixed, so the eye never re-hunts between cuts):**
  - **Headline** — upper third, y≈70–110, centered or left-set. The narration's spoken line, made visible.
  - **Focal subject** — anchored to a vertical third (the reference parks the apparatus at ~x 300, left of center), occupying the mid-band.
  - **Live readout** — a fixed top-right corner (x≈500–588, y≈100–150). The one instrument number.
  - **Annotations** — hang off the subject on thin leader lines (elbow/dogleg), label set in mono, left- or right-flushed to the margin.
  - **Eyebrow** — top, tiny, tracked mono metadata ("CHEMISTRY · CLASS 10").

## 3. Element budget per scene (hard ceiling)

One scene = **one beat = one idea.** Never two. Max inventory:

| Element | Max | Notes |
|---|---|---|
| Focal subject | 1 | the diagram/apparatus/graph — the thing that moves |
| Editorial headline | 1 | ≤ 2 lines, ≤ ~10 words |
| Live data readout | 1 | optional; only when a quantity is running |
| Leader-line annotations | 2 | each anchored to a real element, never floating |
| Eyebrow / metadata | 1 | optional |

Total distinct things ≤ **7**. Over budget → split into two scenes or cut.

## 4. Colour — our tokens, one hit per view

White paper is the ground (`#FFFFFF` / `--clss-paper`). Line-work is ink: `#0D0D10` primary strokes,
`#6E6E76` (ink-500) for secondary lines, labels, and axes. Hairlines `rgba(13,13,16,0.10)`.

**Exactly one subject hue** carries the *meaningful moving quantity* and its label — nothing else is
coloured. Pick by subject, reusing our accents as a semantic thread (the hue *means* the reagent / the data):

- **Chemistry** → magenta `#CC1E7A` (it is literally the phenolphthalein pink — use it as the reactive bloom).
- **Biology / life** → acid `#66B300`.
- **Physics / maths / any brand-mastery or "ignite" beat** → ultramarine `#1F35E0`.
- **Never molten `#FF5A1F`** — that is Wobo's warmth alone (DESIGN §token law).

For a fleeting reactive tint (the flash inside a vessel), use the subject hue at low opacity (0.12–0.25) as a
soft wash, never a saturated fill. **No gradients, shadows, glows, bevels, or glass** — depth is line weight and
one soft contact ellipse under a grounded object, nothing more.

## 5. Type — two voices, presentation attributes only

`<style>` blocks are stripped by the sanitizer, so set every type property as a **presentation attribute** on
each `<text>`.

- **Editorial (the headline):** `font-family="Fraunces, Georgia, serif"`, sentence case, calm and certain,
  ≤ 2 lines. **One** italic emphasis word allowed per film (`font-style="italic"`, e.g. *cliff*, *titration*).
  Fill `#0D0D10`. This is the narrator's voice on screen.
- **Instrument (every label):** `font-family="'JetBrains Mono', ui-monospace, monospace"`, UPPERCASE,
  `letter-spacing="0.12em"`, fill `#6E6E76`. Eyebrows, reagent tags, axis titles, annotations.
- **Data readout:** same mono, but large and `font-variant-numeric` tabular — a big figure + a small unit
  (`24.8` at ~38px beside `mL` at ~12px), like a lab instrument display.

Type scale on the 360-tall grid: headline **~30px** · eyebrow/annotation **~10px** · axis labels **~8px** ·
readout figure **~38px** / unit **~12px**. Left-align or center headlines; never justify.

## 6. Reveal choreography — the beat arc

A film is a subset of these beats, **in order**, one beat per scene (3–6 scenes):

1. **POSE** — a question, alone. Editorial line fades up on an empty ground (the reference opens on near-black,
   then the body lives on white). ~1.5–2.5s. Nothing else.
2. **SET** — the subject *draws itself in* (stroke-dashoffset → 0); the headline states the setup; one label
   arrives on a leader line.
3. **ACT** — the meaningful quantity *moves*: a fill rises, a level drops, the readout steps through its values.
4. **FLASH** — the single charged moment (the aha): the subject hue *blooms then settles* — a soft wash that
   scales up in opacity and fades back. Scarce; one per film.
5. **DATA** — the evidence draws itself: a plot sweeps left-to-right, the endpoint marked with a crosshair and a
   labeled dot. The graph is the hero here.
6. **NAME** — everything clears; the concept is named in the editorial serif, low-contrast, a confident cinematic
   fade (the reference dissolves "This is *titration*" almost to invisibility).

Motion is physics, never keyframe stations (MOTION.md): `calcMode="spline" keySplines="0.2 0 0 1"` on anything
the eye follows; draws run 600–1200ms; hold ~0.2s after a scene enters so the eye arrives before things move;
nothing pops in at opacity 1 from nowhere; a thing that moves settles with ≤ 4% overshoot.

**Buildable SMIL primitives:** draw-on (`animate` stroke-dashoffset), rise-fill (`animate` a rect/clip height or
a `clipPath`), sweep (a curve's stroke-dashoffset), bloom (a `circle` scaling opacity up then down),
fade/settle (opacity + transform). A **live number steps** through its key values (start · mid · endpoint) via
timed `<set>` opacity on stacked `<text>` — SMIL cannot tween glyphs, so never fake a smooth counter; a graph
**draws**, it never snaps in whole.

## 7. Sync law (from MOTION.md §5)

Every visible element enters and leaves **inside its narration beat** — a beat's visuals may not outlive its
sentence by > 300ms. The frame holds only what the current sentence is about; anything the narration has moved
past is gone.

## 8. CHEAP-TELLS blacklist — anything here drops us below the reference bar

- More than one saturated hue in a frame; rainbow palettes; coloured backgrounds.
- Gradients, drop shadows, bevels, outer glows, glassmorphism, text outlines/shadows.
- System or default fonts for the headline (Arial, Helvetica, Times), or a novelty "fun/science" font.
- Emoji, clip-art, cartoon mascots, googly-eyed bubbling beakers, sticker icons.
- Centered-everything with no negative space; two ideas in one scene; bullet-point slides; a title-over-content slab.
- Bouncy / elastic / spinning / wipe / star-burst / slide-carousel transitions; linear easing on followed motion.
- Everything animating at once; ambient motion with no meaning (chrome that moves for its own sake).
- Inconsistent stroke weights; thick cartoon outlines; filling closed glass edge-to-edge with saturated colour.
- Floating labels with no leader line; UI chrome inside the scene (progress dots, buttons, cards).
- A number counter that jitters or tweens per-glyph; a graph that appears fully-formed instead of drawing.
- Any element outliving its narration sentence by more than a blink.

---

## Storyboard prompt addendum — paste into the `"video"` system prompt in `engines.py`

```
VISUAL BAR — every PAUSED frame must read as a premium editorial diagram, not a slide: ink line-work on white, ONE hue, deep margins, at most 7 marks, one focal subject. If a frame reads as "title + bullets", redraw it.
Two type voices only, set as presentation attributes (no <style>): an editorial serif for the ONE headline (font-family="Fraunces, Georgia, serif", sentence case, at most 2 lines, at most one italic emphasis word, fill #0D0D10); UPPERCASE tracked mono for every label/eyebrow/readout (font-family="'JetBrains Mono', ui-monospace, monospace", letter-spacing 0.12em, fill #6E6E76).
Colour law: white ground; strokes #0D0D10 and #6E6E76 at ONE hairline weight (stroke-width 1.5). Exactly ONE subject hue carries the meaningful moving quantity and its label — chemistry #CC1E7A, biology #66B300, physics/maths/mastery #1F35E0; NEVER molten #FF5A1F. No gradients, shadows, glows, bevels, glass; a reactive tint is that hue at 0.12–0.25 opacity, never a saturated fill.
Layout on viewBox="0 0 640 360": headline upper third (~30px), one focal subject on a vertical third, at most one live readout in a fixed top-right corner (big tabular figure ~38px + small unit ~12px), at most 2 annotations each on a thin leader line to the margin (~10px mono). Never two ideas in one scene.
Each scene is ONE beat of this arc, in order, using only the beats the idea needs: POSE (a question alone) → SET (subject draws itself in) → ACT (the quantity moves / readout steps) → FLASH (the charged aha: the hue blooms then settles, once per film) → DATA (a plot draws left-to-right, endpoint marked with crosshair + labeled dot) → NAME (concept resolves in the serif, low-contrast fade).
Motion is physics: SMIL with calcMode="spline" keySplines="0.2 0 0 1" on anything the eye follows; draw line-work on with stroke-dashoffset→0; sweep curves and rise fills; nothing pops in at opacity 1; nothing linear.
A live number STEPS through its key values (start · mid · end) via timed <set> opacity on stacked <text> — never a smooth glyph counter; a graph DRAWS, never snaps in whole.
Every element enters and leaves inside its narration sentence (≤300ms slack); the frame holds only what the current sentence is about.
BANNED (reads cheap): more than one hue; gradients/shadows/glows/glass; system or novelty fonts; emoji/clip-art/mascots; centered-everything, bullet slides, title-over-content; bouncy/spin/wipe/carousel transitions; everything moving at once; inconsistent stroke weights; floating unlabeled leaders; UI chrome inside the scene.
Aim for the reference bar: a calm, spacious, instrument-precise film where one hue and one idea carry each frame — never a decorated slideshow.
```
