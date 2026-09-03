# CONTENT-VISUALS.md — how every learning visual is drawn

Companion to `DESIGN.md` and `VIDEO-QUALITY.md`. This file governs the **content visual** —
the object at the centre of a learning card: the thing being shown, felt, and manipulated. It is
law for `engine.compose` (discovery / compare / whatIf / conceptMap marks), `engine.diagram`, and
every mark-based surface the learner acts on.

The bar is one sentence: **at par with brilliant.org, or better.** Inspiration, never replication —
Brilliant's ideas rebuilt in *our* palette (ink + subject hue) and *our* restraint.

---

## 0. The one distinction that resolves everything

`DESIGN.md` law 3 (no shadows) and law 4 (one hit of pigment) govern the **chrome** — the app
frame, nav, cards, buttons, readouts. That stays austere: hairlines, one pigment, no fills. Nothing
here touches it.

The **content visual is different**. It is hero art (law 7 "every visual IS the idea", law 10
"built to be screenshotted", law 11 the twin). Inside the visual the rules invert:

- The focal object **IS** the one hit of pigment for the view — so it is rendered with a filled,
  weighted body, not a hairline. Law 4 holds: still one subject, still one hue family.
- Dimension comes from **layered flat tone** — a base fill plus a darker offset face plus, when it
  earns it, a lighter top edge. Hard edges, no blur. That is not a shadow and not a gradient, so
  law 3 holds. It is exactly what Brilliant does (look closely at their blue blocks: a lighter
  top-left face, a darker body, a bright corner notch — three flat fills, zero gradient).

Chrome is a European-minimal instrument. The content visual is a chunky, tactile, little world
sitting inside it. Both are true at once.

---

## 1. Where we fall short today (the honest gap)

Side-by-side, our generated visuals against theirs:

1. **Hairline austerity vs filled weight.** Every focal object of ours is outline-only —
   `fill:'none'` until a reveal lights it. The compare cells are hollow rings, the perturbation
   curve a single hairline, the tower thin grey lines, the concept-map nodes empty pills. Brilliant
   fills every object solid and lets it carry weight.
2. **Flat wireframe vs flat-shaded dimension.** Our objects live on one plane with no side, no
   thickness, no tonal step. Brilliant's block has a face; its scale has a base; its icons read as
   objects with a lit side and a dark side.
3. **Annotation vs graspable thing.** Our slider handle is a bare dot on a hairline; our drag
   target is a thin dashed ring. They read as *marks on a diagram*, not things a hand would grab.
   Brilliant's knob is a white disc with a ring; its draggable point is a fat dot with a glow.
4. **A lone mark vs a built world.** Ours is usually one abstract shape floating in a big tinted
   box (one curve, one ray, one triangle). Brilliant builds a small scene: blocks *on* a scale
   *with* a readout of 40; a receipt *and* phone *and* coffee.
5. **Timid scale.** Our focal object floats small with vast dead margin (the bent-straw glass, the
   refraction ray sit tiny in their panels). Brilliant's object dominates its canvas.
6. **Blueprint colour vs finished colour.** One thin ultramarine stroke on grey reads as a
   wireframe. Brilliant's confident navy / gold / teal fills read as a finished illustration.
7. **Static picture vs visible affordance.** Our diagram says "tap the spot" but the picture
   doesn't *look* touchable. Brilliant's object announces where to grab before you read a word.

None of this is a colour problem or a token problem. It is a **fill, weight, dimension, and scale**
problem. Everything below fixes exactly that.

---

## 2. The palette for content (grounded in tokens)

Only these, ever. Molten `#FF5A1F` is Wobo's own warmth as the tutor — **never** on a content visual.

| Role | Light | Use |
|---|---|---|
| ink primary | `#0D0D10` | outlines, axes, primary label, dark faces |
| ink secondary | `#6E6E76` | secondary lines, muted labels, ground |
| ink tint face | `#0D0D10` @ 0.06–0.12 | a neutral filled body / far ground |
| physics · maths · mastery | ultramarine `#1F35E0` | the subject hue for STEM |
| chemistry | magenta `#CC1E7A` | the subject hue for chem |
| biology · life | acid `#66B300` | the subject hue for bio |

**One subject hue per visual.** Its dimensional set: `base` (the fill), a **darker face** (the hue
at `-active`/deep, or ink `#0D0D10`, for the side/thickness), and a **soft tint** (`base` @
0.12–0.22) for a light body or reactive wash. Ink is the free structural colour. At most **one**
extra accent from the family, and only when two things genuinely differ (Brilliant's red-vs-blue
probability bar). Never a third.

---

## 3. The laws

### 3.1 Fill-weight law
The focal object is **filled**, never a lone outline. Choose a body:
- **Solid** — `base` at 0.85–1.0. A chunky saturated object (a tile, a block, a bead, a node). Its
  label sits inside in white/`on-ink`. This is the default for a *thing* (a tile, a cell, a charge).
- **Soft** — `base` @ 0.12–0.22 with a `1.4`-weight `base` stroke. A light, roomy body you can put
  detail inside (a beaker, a panel, a container). This is Brilliant's light-object look.

Outline-only (`fill:'none'`) is allowed **only** for pure structure: axes, a grid, a leader line, a
ray, an angle arc. The moment a shape represents an *object*, it gets a fill.

### 3.2 Dimension via layered flat tone (not gradients, not shadows)
Give a solid object thickness with **two or three stacked flat fills**, no blur anywhere:
1. **Face / thickness** — a copy of the body offset ~1–1.5 units down-and-right, filled the darker
   face tone, drawn **behind** the body. This is the side. Hard edge. Not a drop-shadow.
2. **Body** — the `base` fill on top.
3. **Highlight (optional)** — a small lighter notch or top-left edge (`base` @ low opacity, or
   white @ 0.5) that catches light. Brilliant's corner square.

Two flat fills already read as a real object. Three is the ceiling. If you reach for a gradient, a
blur, or a glow to get depth, you have broken the law — stack another flat tone instead.

### 3.3 Object tactility
Anything the learner grabs must *look* grippable before they act:
- A **drag handle** is a filled disc, `r ≥ 3.5`, in the subject hue, with a 1-unit ring around it —
  a knob, never a 1px dot.
- A **tap target** is a whole filled body, never a hollow outline. The existing pulsing hit-ring
  sits around it.
- A **slider** rides on a track with a real knob. The value it drives is shown big.
- Rounded corners on tactile rects (`rx ≥ 2`) — a physical tile, not a cell in a table.

### 3.4 One idea, one picture
The picture carries the idea **on its own**, with its in-frame label. Prose is caption, never the
carrier. Test: cover the text — is the idea still legible from the drawing? If not, redraw the
drawing, don't add a sentence. One focal subject per stage; never two ideas fighting.

### 3.5 Manipulability-first
Prefer the visual the learner can *move* over the one they only look at. A number is a slider or an
editable field, not printed text. A relationship is a thing you drag until it breaks, not a stated
fact. If it can be felt, it is built to be felt (`DESIGN.md` §9). A static diagram is the fallback,
and even it must look like it *could* be touched.

### 3.6 Draw the thing, build the world
Draw the **object**, not a diagram of the object. A tower is a filled tower with a base, not a
vertical line. A scale is a platform with a body and a readout, not a triangle. Then give it **one
companion** that makes it a scene, not a specimen: the block sits *on* the scale; the ray crosses a
*filled* water body; the point sits *on* a grid with weight. One focal + one context element beats
one lonely mark. Stop before clutter — the ceiling is ~7 weighted marks.

### 3.7 Size & negative-space grid
Canvas is `0..100` by `0..62` (discovery/compare) or the diagram's own viewBox.
- The focal object occupies **40–70%** of the shorter axis. Never under ~30 units tall.
- **≥ 10 units of clear margin** on every side. The object is centred or on a clean third.
- Weighted marks over many marks: **≤ 7** total, each one filled and load-bearing. A field of tiny
  strokes is clutter; a lone tiny mark in a huge box is timid. Aim for one confident object that
  fills its room.

### 3.8 The cheap-tells blacklist (any one of these = redraw)
- A hairline-outline object as the focal subject (wireframe / blueprint look).
- A single abstract mark floating in a big empty tinted box.
- Gradients, drop-shadows, glows, bevels-as-glass, neumorphism, "3D-render" gloss.
- Emoji, clip-art, stock-icon silhouettes, mascots (Wobo is the only character, and Wobo is chrome).
- More than the subject-hue family + ink + one accent; any rainbow.
- Text that carries meaning the picture leaves out.
- A tiny timid object adrift in dead margin — or the opposite, a clutter of many small strokes.
- Molten `#FF5A1F` anywhere in content.
- A "diagram of a thing" when the thing itself could be drawn as an object.

---

## 4. Composer-prompt addendum (paste-ready)

Splice this into the `compose` and `diagram` system prompts. It is the §3 laws compressed to
prompt-weight. (Live in `engines.py._SYSTEMS`.)

> **CONTENT-VISUAL LAW — draw tactile filled objects, not hairline wireframes (at par with
> Brilliant).** The focal object of every mark visual is a *thing*, filled and weighted — never a
> lone outline. (a) FILL: give a real object a body — SOLID (a chunky saturated tile/block/bead/node,
> subject hue at high opacity, label in white inside) or SOFT (a roomy container, subject hue at
> 0.12–0.22 with a hue stroke). Outline-with-no-fill is ONLY for pure structure: axes, grid, a ray,
> a leader, an angle arc. (b) DIMENSION: give a solid object thickness by STACKING FLAT TONES — a
> second copy of the body offset ~1–1.5 units down-right in a darker tone (the hue deepened, or ink)
> drawn behind it as a side face; optionally a small lighter top-left highlight. Hard edges only.
> NEVER a gradient, blur, glow, or shadow to fake depth — stack another flat fill instead. (c)
> TACTILE: a drag handle is a filled hue disc r≥3.5 with a ring (a knob), a tap target is a whole
> filled body — never a bare dot or hollow ring. (d) SCALE: the focal object fills 40–70% of the
> canvas, ≥10 units clear margin each side, centred or on a clean third, ≤7 weighted marks. (e)
> BUILD A SCENE: draw the object, not a diagram of it (a filled tower with a base, not a line), and
> give it ONE context companion (the block ON the scale). (f) PALETTE: one subject hue (physics/
> maths #1F35E0, chemistry #CC1E7A, biology #66B300) + ink + at most one accent when two things
> differ; molten #FF5A1F is banned in content. BANNED (reads cheap): hairline-only focal objects,
> a lone mark in an empty box, gradients/shadows/glows/glass/3D-gloss, emoji/clip-art/mascots,
> rainbow palettes, text that carries what the picture omits. Use `fill:'soft'|'solid'` on marks
> that are objects.

For the **diagram** engine specifically, the existing one-hue COLOUR LAW stays for line-work, but
add: *"When the subject is an OBJECT (a beaker, a cell, a tower, a block, a lens), fill it — a soft
subject-hue body (hue @ 0.14) with a hue stroke, and a darker offset face for thickness — do not
draw it as a hairline outline. Only axes, grids, rays, and leaders stay unfilled."*

---

## 5. Scoring rubric — for the validation gate's judge

Score each content visual on all six axes, 0–5. **PASS requires fill-weight, dimension, and
tactility each ≥ 3, and zero blacklist tells.** **At-par-with-Brilliant requires every axis ≥ 4.**

| # | Axis | 0–1 (fail) | 3 (pass) | 5 (at par / better) |
|---|---|---|---|---|
| 1 | **Fill & weight** | focal object is a hairline outline / `fill:'none'` | focal object is filled | every object filled and weighted; wireframe only for axes/rays |
| 2 | **Dimension** | flat single plane, no thickness — *or* a gradient/shadow/glow used to fake it | one darker offset face gives the object a side | 2–3 stacked flat tones read as a real lit object, hard edges, no blur |
| 3 | **Tactility & manipulability** | bare dot / hollow ring; picture looks static | handles are knobs; tap targets are filled bodies | object announces where to grab; you can feel it move before reading |
| 4 | **One idea, one picture** | must read the prose to know what it shows | picture carries the idea with its label | idea is instant and unmistakable from the drawing alone |
| 5 | **Composition** | tiny timid mark in dead space, or clutter of many strokes | focal object sized right, reasonable margin | one confident object fills its room, ≥10u margin, ≤7 weighted marks |
| 6 | **Restraint** | rainbow / molten / >1 accent / a cheap tell present | subject hue + ink, no tells | subject hue + ink (+1 accent only if two things differ), spotless |

Judge output: `{ "pass": bool, "atPar": bool, "axes": {fill,dimension,tactility,oneIdea,composition,restraint}, "tells": [<any blacklist tell seen>], "redraw": "<one concrete instruction if not atPar>" }`.
A single blacklist tell forces `pass:false` regardless of axis scores — a cheap tell is
disqualifying, not deductible.

---

## 6. Reference reading (what "better than Brilliant" would mean)

Match their weight and tactility, then beat them on **restraint and coherence**: they reach for a
second and third hue and the occasional gloss; we hold one subject hue and ink, so our worlds read
as one system across every subject. Same physicality, less noise. That is the win condition.
