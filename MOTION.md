# MOTION.md — the motion doctrine (thought by Fable 5, built by the fleet)

> Owner law: subtle parallax, animations, and transitions wherever possible — designed here,
> implemented exactly. Motion is physics or it is nothing: springs and velocity continuity,
> never keyframe stations, never linear easing on anything the eye follows.

## 1. The three depths (parallax law)
Every scene with vertical scroll gets three depth planes, moving at these scroll rates:
- **Sky/atmosphere** 0.08 — washes, glows, ambient art (Expedition sky is the reference).
- **Context** 0.16 — distant silhouettes, watermark sigils, hero backdrops.
- **Content** 1.0 — everything the learner reads or touches. NEVER parallax interactive elements.
Implementation: one rAF-throttled scroll listener per scene writing `translateY` to refs
(AdventureRoadmap.tsx has the canonical pattern). Reduced-motion: all planes at 1.0.
Where to apply: Expedition (done), Home thread (sky wash + Wobo's beam at 0.08; thread at 1.0),
SubjectScreen poster band (glyph stage at 0.16 under the scrolling chapter list), Progress
(constellation at 0.16), Course intro (constellation field at 0.08 behind the sigil).
Pointer parallax (desktop only, ±6px max, spring-lagged): hero art on Home and course intros.

## 2. Route transitions (the shared-axis law)
Navigation is spatial. Forward (deeper: home→subject→course) = shared-axis: outgoing slides
-24px x and fades (180ms), incoming +24px→0 with spring (stiffness 260, damping 30). Back =
mirrored. Sibling tabs (nav routes) = crossfade + 8px y-rise, 220ms. Scenes that own the
viewport (Expedition, victory theatre) = their own entrances (clouds, light) — never doubled
with route motion. One transition sound (soft whoosh-tick, sfx, mute-aware) on route class
changes only — never on sibling tabs.

## 3. Element choreography
- **Entrance**: cascade (existing `cascade`/`rise` in ui/kit) — 40ms stagger, 12px rise,
  spring settle. Nothing pops in at opacity 1 from nowhere.
- **Hover**: lift y:-2 + shadow deepens (120ms); press: scale 0.97 spring back. Cards tilt
  max 1.2° toward pointer (existing TiltCard) — content cards only, never buttons.
- **Numbers** (XP, scores, streaks): always count via springs (no instant swaps).
- **Progress fills**: draw with `pathLength` springs, 0.2s delay after mount so the eye is
  there when they move.
- **Earned moments**: pigment + light + sound land TOGETHER on the same frame (DESIGN law).

## 4. Continuity rules
- A thing that moves arrives with velocity and settles with overshoot ≤ 4% (damping 26-32).
- Nothing teleports: shared elements between views (sigils, avatars, medallions) scale/fade
  from their last position when feasible (framer `layoutId`).
- Durations: micro 120-220ms, structural 260-420ms, theatre 800-1400ms. Never longer.
- Reduced-motion: parallax off, transitions become 150ms crossfades, theatre becomes a
  single fade — meaning is never motion-dependent.

## 5. Content & video pipeline (owner routing law, 2026-07-07)
For generated content AND videos: **Sonnet/Opus FETCH** (gather sources, facts, curriculum
material, assets — breadth work) → **FABLE 5 DECIDES how to show it** (the presentation:
which content type, what visual form, pedagogy shape, motion spec per §1-4) → **OPUS BUILDS**
to Fable's detailed instructions (Sonnet builds videos by default; Opus steps in on complexity
flags or failed quality checks — registry law). No content ships whose presentation form
wasn't decided at the orchestration layer.
Video sync law: every video's voiceover (Gemini TTS) is beat-aligned — scene plan carries
per-beat narration text; renderer advances scenes on narration boundaries (never fixed
timers); a beat's visuals may not outlive its sentence by >300ms.
