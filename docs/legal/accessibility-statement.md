# Accessibility statement

Draft of 3 September 2026. Version 0.1. Written by the Wobo team, not yet reviewed by a lawyer, and not yet audited by an accessibility specialist. See `README.md` in this folder for the review checklist.

> **In plain words**
>
> We want Wobo to work for everyone: with a keyboard, with a screen reader, with motion turned down, with large text, on a small phone, and with a stylus.
>
> Some of it does that well today. Some of it does not yet, and we would rather name the gaps than claim we are finished.
>
> If something in Wobo is in your way, tell us at support@heywobo.com and we will fix it, and give you a way through in the meantime.

---

## 1. What we are aiming for

We are building Wobo to meet the Web Content Accessibility Guidelines version 2.2 at level AA. We have not yet been independently audited against them, so this is a statement of intent and of current state, not a claim of conformance. When the audit is done, this document will say what it found. [REVIEW: WCAG version and level to commit to; whether a formal conformance claim, an accessibility conformance report, or an EU accessibility statement in the prescribed format is required.]

Legal frameworks that may apply to us: the European Accessibility Act and the harmonised standard EN 301 549; the Equality Act 2010 in the UK; the Americans with Disabilities Act and, for public-sector customers, Section 508 in the United States; the Rights of Persons with Disabilities Act 2016 and the guidelines for Indian government websites. [REVIEW: which of these bind us given where we sell, and the deadlines under the European Accessibility Act.]

## 2. What works today

- **Keyboard.** Every control can be reached and used with a keyboard, with a visible focus ring, and a skip link to the main content.
- **Screen readers.** Interactive elements carry names, roles and states. Wobo's speech is also available as text.
- **Reduced motion.** Setting reduced motion on your device turns off the drawing animation, the character's idle movement and the transitions. Wobo still teaches; the board simply appears rather than being drawn.
- **Text and zoom.** The interface reflows to 400 per cent zoom and respects the text size set on your device.
- **Contrast.** Text and meaningful interface elements are checked against the 4.5 to 1 and 3 to 1 ratios in both the light and the dark theme.
- **Colour is never the only signal.** Right and wrong are shown by a mark, a shape and words, not by red and green alone.
- **Voice is optional.** Nothing needs a microphone, and nothing needs sound. Every spoken explanation exists as text.
- **Touch targets** are at least 44 by 44 pixels, and the layout is composed for a phone in portrait, a tablet in either orientation, a laptop and a large monitor.
- **Timing.** Nothing in a lesson is timed against you, and no answer expires.

[REVIEW: every claim above must be verified by test before this document is published. Do not publish a claim we have not measured.]

## 3. Where we are not there yet

We would rather list these than let you discover them.

- **The board.** Wobo's central idea is drawing, and a drawing is hard to convey without sight. Every board carries a text description of what was drawn and what it means, and Wobo narrates as the ink appears. That is not the same as seeing it, and for some diagrams the description is thinner than it should be. This is our largest gap and our largest area of work. [REVIEW: whether describing a board in text meets WCAG 2.2 success criterion 1.1.1 for non-text content and 1.4.5 for images of text, whether the board counts as a live region needing 4.1.3 status messages, and whether a product whose central mechanism is visual can claim level AA at all without an equivalent non-visual path.]
- **Drawing your own answer.** Some practice items ask you to draw a line, shade a region, or place a point. Each of those has a keyboard and screen-reader path, and some of those paths are more awkward than the pointer version. Where an item cannot be answered without drawing, you can ask Wobo for a different way to answer the same question.
- **Handwriting recognition** works less well with some handwriting than others, and it is not a fair way to assess anyone. It is never the only route to an answer.
- **Simulations.** Some of the older interactive simulations predate this standard and are being rebuilt. Until they are, Wobo can explain and operate them for you on request.
- **Language.** Wobo teaches in English today, with more languages planned. Curriculum names appear in their original language alongside an English rendering.
- **Captions.** Where Wobo plays a short animated explanation, captions are not yet available, and neither is audio description. Wobo's spoken explanations do exist as text, which covers most of what a learner hears, but the animated explanations do not carry captions today. [REVIEW: whether the animated explanations are prerecorded media under WCAG 2.2, which would bring 1.2.2 captions and 1.2.5 audio description into scope, or synchronised generated speech, which may not be.]
- **High contrast.** A dedicated high-contrast theme is planned and not built. There is a light theme and a dark theme, both checked against the contrast ratios in section 2, and the contrast, inversion and colour-filter settings on your own device apply on top of them.

## 4. Things you can turn on

In settings, under appearance and accessibility: theme, light, dark or follow the device; reduced motion, on, off or follow the device; text size; sound effects on or off; narration on or off; the drawing speed of the board; and how proactive Wobo should be, which is also the control for anyone who finds movement or interruption difficult.

A high-contrast theme is not among them. It is planned, not built, and it is listed in section 3 with the other gaps rather than here.

## 5. Assistive technology we test with

We test with [screen readers], [browsers] and [operating systems], on a phone, a tablet and a desktop. [REVIEW: name the actual test matrix once it exists, and state the date of the most recent test.]

## 6. Tell us

Write to support@heywobo.com. Tell us what you were trying to do, what got in the way, and what you use. We will reply within [5 working days], tell you what we are going to do, and give you a way to get the thing done in the meantime.

If our answer is not good enough, you can escalate to [named person or role] at support@heywobo.com, and, where you have one, to the enforcement body in your country. [REVIEW: name the enforcement route per jurisdiction, which the EU accessibility statement format requires.]

## 7. How this document is kept honest

This statement is reviewed whenever a surface changes materially, and at least every six months. It records what we have tested, not what we hope. Prepared on 3 September 2026, based on a self-assessment. Last tested: [date]. Next review: [date]. [REVIEW: the EU statement format prescribes the preparation method, the date, and the feedback mechanism.]
