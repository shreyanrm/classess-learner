# 09 · Parent Companion Flow

**WHEN:** after a parent is linked; weekly digest cadence; any parent question; consent elevation for under-18.
**WHERE:** primarily **WhatsApp** (Tech Provider capability — a product surface, not just notifications) + email fallback.
**WHY:** the parent is the payer for younger learners and the consent-giver under DPDP. Their product is a **relationship of pride**, not a
dashboard. **Lead with pride, then opportunity, never deficit-shame.** Make the child's capacity *real and visible*.

**WHAT (steps):**
1. **Link + consent** — parent links to the learner; for under-18 this is also the **verifiable parental consent** path (DigiLocker-grade,
   final/auth phase) that **elevates the consent tier**. Until elevated, the experience runs un-elevated (no profiling).
2. **Weekly artifact** — a generated visual digest: what the child mastered, a real strength, one honest opportunity, a proud moment. Built
   from the twin (so it is true). Pride first.
3. **Ask-anything** — parent asks the companion about progress; answers in honest conditional ranges, warm and plain.
4. **Opportunity** — only after pride, a gentle, honest opportunity (what would help next; the upgrade if relevant). Never fear-led, never
   shame. ~80/20 aspiration/fear holds here too.

**HOW:** WhatsApp via the Tech Provider integration; digest generated from twin/governed views; parent-companion turns through the gateway;
consent elevation writes the parental-consent record (auth phase) and flips the tier on subsequent events.
**EVENTS:** `parent.linked.v1`, `parent.digest.sent.v1`, `parent.query.asked.v1`, `consent` elevation event (auth phase).
**AI CALLS:** `twin.query`, `parent.companion.turn`, `generate.digest` (verified, true-to-evidence).
**STATES:** unlinked · linked(un-elevated) · consent-elevated · weekly-digest · ask-anything · opportunity.
**GUARDRAILS:** pride before opportunity, always; capacity numbers must be real; no deficit-shame; no behavioural targeting of the child;
consent elevation is genuine verification, not an OTP checkbox.
