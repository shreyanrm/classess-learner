# CONTEXT.md — Wobo, at ecosystem altitude

This file is what you are building and why. Read it before you interpret any task. `DESIGN.md` is its companion — how it looks and behaves. Both are law.

Register: precise, dense, opinionated. Product copy is sentence case, no emoji, no exclamation marks, calm and certain.

---

## 0. How to hold this

The entity being built is the **Dot eVentures education ecosystem**. That is the product. Every app is a participant within it. Do not treat any single app as the center, and never treat KGtoPG as one app's database. Architect ecosystem-first — canonical identity, the ontology, the platform contracts, governance, the truths shared across all products — then build each product to plug in correctly. Wobo is the first and flagship product: build it as the reference implementation that proves the pattern every future product follows.

## 1. The citizens

**Ecosystem (the entity)** → its citizens:
- **KGtoPG** — the platform citizen (identity + data + intelligence platform every product plugs into).
- **Wobo** — the flagship consumer product of the Classess ecosystem, and the tutor who lives inside it: one name for both. *This build.*
- Classess Teacher, Classess School (Admin / Teacher / Student / Parent), LearnEng, Edmissions, Feesable, future ventures, and partner apps that connect partially.

Apps share a platform, never tables. Each owns its operational data and runs independently; it joins the ecosystem by authenticating through KGtoPG, emitting attributed events upward, and reading only governed, scoped views downward.

## 2. KGtoPG — the platform citizen

A product in its own right, not a backbone of any app. The governed identity, data, and intelligence platform every product plugs into. It serves the ecosystem and belongs to no single app; it has its own surface, responsibilities, and roadmap.

Pattern: Segment (unified profile / CDP) + Plaid (one clean plug-and-play SDK contract) + Palantir (canonical ontology — "mastery / engagement / struggle" mean the same thing everywhere) + Google (feature store) + Snowflake (layered storage: raw lake vs. transformed warehouse) + ServiceNow (platform-not-product lock-in; each new venture inherits identity + profile + intelligence on day one).

Internal hierarchy: **User** (one global UUID forever) → **AppMembership** (User × App × Role) → data domains (some global, some membership-scoped) → **immutable event lake**.

Properties: full app independence; plug-and-play onboarding via SDK; **data gravity** — the business can never bulk-extract; an app that leaves loses access while the data stays; the individual keeps DPDP rights. Never conflate "app leaves" with "user deletes." **Event sourcing is the spine** — immutable, replayable events mean the AI's understanding of every existing user improves retroactively as models improve; the moat compounds backward in time.

Named services KGtoPG exposes (from the conscience docs): Learner Identity Service · Relationship Service · Consent & Permission Service · Academic Ontology Service · Learning Record Store · Evidence Engine · Learner Graph · Gap Detection Engine · Intervention Orchestrator · Analytics Access Layer.

**What Wobo consumes from KGtoPG:** identity and sign-in, the canonical profile, the academic ontology, the prerequisite graph, consent and age gating, the learning record store, and the governed read views. What it owns locally: its operational data and its own surfaces. It emits its full event firehose upward.

## 3. Wobo — the flagship

A B2C, AI-native consumer learning app. **Learners only — no teachers, no schools inside it.** Quality education at an affordable cost; a real profit model with a genuine social cause.

North star: *Brilliant.org, but AI-native, built for India, premium, with mechanics nobody in edtech has shipped.*

It is the **Independent Student entry point** into the larger identity model — a learner starts solo, and the same permanent KGtoPG profile later gains tutor or school spaces if they connect one, without ever fracturing into separate accounts. Wobo stays pure; KGtoPG holds the door open.

Strategic frame: Wobo is **top-of-funnel for the entire ecosystem** (Physics Wallah model — a beautiful free consumer brand pulls students and parents, which pulls schools toward the B2B products). The second product is a demand engine, not a distraction.

## 4. Locked decisions — non-negotiable

- **Production-ready, full-fledged, end-to-end.** No MVP, no phases, no versions. Built for scale and correctness from line one. No stubs, no "later." Where a platform service has no consumer yet, its contracts, event schema, and ontology are still built complete and immutable from line one; only the heavy service materializes as citizens connect. Discipline, not phasing.
- **Plexus is the sole content source of truth**, grounded on our catalogs (NCERT 157 chapters / 604 topics / ~3,500 items). Content is generated and personalized per learner — no question banks, no static libraries — "written for you, just now." *(See §6 for the open flag on the word "Plexus" and the exact engine enumeration.)*
- **GeoGebra eliminated** → JSXGraph + Mafs + Three.js / R3F.
- **Compliant by design, bulletproof from every direction** — legal / DPDP + kids' data, architectural, security, operational, ethical, reputational. Age and consent are first-class primitives that open legal capability. Build the doors the law provides; never chase gaps — intent and documentation are what create violations. PII vaulted and segregated from pseudonymized behaviour. No data ever sold.
- **Deletion model:** raw personal data leaves on account deletion; de-identified / aggregated insight and model learnings stay — the link to the human is severed at deletion. Event sourcing makes this clean and lossless.

## 5. The intelligence spine

Wobo is a citizen; it plugs in by doing exactly three things, and this pattern is the reference for every future product.

1. **Authenticate through KGtoPG** — one canonical UUID for life, valid across every future product.
2. **Emit attributed events upward** — a firehose of every meaningful action, each stamped app / user / purpose / consent / type, clean from the first commit.
3. **Read governed views downward** — a controlled faucet of scoped, consent-gated views. Never bulk access to the canonical store.

**Why the event contract is immutable from line one:** an app that merely writes to its own tables cannot be retrofitted later without losing the behavioural history forever. The heavier intelligence that consumes the events can mature later; the emission side cannot be deferred.

**"Every learner has their own mind," implemented correctly:** not one trained model per user — that is millions of unverifiable models with no shared learning. It is **one shared model fabric conditioned on a persistent per-learner context store**: knowledge profile, event history, mastery state, behavioural signals, preferences, and a learned representation of how that specific learner thinks. The model is shared; the mind is theirs. The Track-2 slot in the router holds the future of true on-device edge SLMs per learner, offline — filled when it matures, with no re-architecture.

**Consent and age as capability doors:** deep behavioural profiling, the adaptive engine, and the knowledge twin light up only at the consent and age tier that legally permits them, gated by verifiable parental consent where the learner is a minor. A constrained-but-still-excellent experience runs for the un-elevated tier. Verify current DPDP children's-data rules before treating any of this as settled.

## 6. Plexus — the content engine, and the three-tier economy

Plexus generates and personalizes all content per learner, grounded on the catalogs via retrieval. Content is generated, verified, cached, and reused across learners and boards, then cheaply personalized. Fable 5 orchestrates the generation; Opus 4.8 does the heavy generation; the verification substrate gates everything.

**The three-tier economy — this is the business model, not an optimization:**
- **Tier 1 · warm cache** — a verified artifact keyed by (concept × difficulty × archetype) serving the free tier at near-zero marginal cost. The first learner pays for generation; the next thousand reuse it. Topics are identical across learners and boards, and the first content focus is science, maths, and social science (not languages), so reuse is high from the start.
- **Tier 2 · cheap SLM personalization** — a small model layers names, the chosen analogy, tone, and pacing onto the cached core, so it still feels "written for you, just now" while the expensive part was written once.
- **Tier 3 · bespoke frontier** — true Opus 4.8 generation, reserved for paid and genuine edges: a custom out-of-syllabus course, an unanticipated misconception, a synthesis boss from a unique mastered set.

Hold a **target gross margin per free DAU** as a real, tracked number. "Written for you" survives as largely-true framing built on the cached path, never modelled on the bespoke path. Every artifact carries provenance: prompt version, model, and the catalog nodes it was grounded on.

> **OPEN FLAG — Plexus.** A prior spoken instruction ("Plexus ruled out completely") conflicts with the canonical instruction that Plexus is the sole content source of truth. This file follows the canonical instruction: Plexus lives as the dedicated, from-scratch content engine grounded on the catalogs. The three preserved artifacts (catalogs, prerequisite graph, verification substrate) hold regardless. If a canonical enumeration of "Plexus's 13 engines" exists, load it from the relevant skill; this file describes Plexus's responsibilities through the content-type taxonomy in `DESIGN.md` and the crown-jewel mechanics in §9, rather than asserting an enumeration it cannot verify. Confirm the Plexus decision with Shreyan before treating the naming as settled.

## 7. The seven hardening subsystems — first-class, by name

Never folded into "guardrails." Each is its own owned component.

1. **Generation / cost economy.** The three-tier economy of §6, with the tracked margin-per-free-DAU.
2. **Consent-and-age-tiered intelligence model.** The engine that powers the product must be legally permitted for the exact (often minor) user it is built for. §5.
3. **Correctness / verification substrate.** No generated content reaches a learner unverified — symbolic CAS verification for maths and physics, re-run unit-tested simulations, numeric bounds, golden second-model cross-checks, and a confidence gate that refuses to serve unverified content. A wrong answer to a child is existential.
4. **Child-safety subsystem (its own owner).** Moderation on every UGC artifact before another learner sees it; crisis detection and escalation on conversations with Wobo; conversation-safety classifiers; no private unmonitored channels between users. Ethical imperative and the fastest way the brand could go radioactive.
5. **Grading calibration harness.** Free-reasoning evaluation (text + voice, Indian-English / Hinglish / vernacular) on versioned rubrics, calibrated against human-graded sets with tracked agreement; confidence-banded (auto-accept high, escalate the middle); an "I think I'm right" re-grade path; adversarially hardened against gaming.
6. **Prerequisite graph.** The edges between the ~3,500 catalog nodes are an owned, expert-validated artifact — Plexus may propose edges, a validation pipeline confirms them before the knowledge twin trusts them. The twin, the budget meter, FSRS scheduling, rabbit-hole bridges, and boss battles all rest on it.
7. **Integrity / anti-abuse layer.** Earn-it-forward, referrals, and sponsored seats are a fraud surface (Sybil farming, referral abuse). Build the integrity layer from line one.

## 8. The learning intelligence

- **Academic ontology.** "Similarity is not intelligence, relevance is." Relevance comes from what is academically true for *this* learner, on *this* board, at *this* grade, given what they have already mastered.
- **The mastery model — two 80%s are not equal.** `Mastery = Performance × Reliability × Independence × Difficulty × Recency × Consistency`. The decisive dimension is **Independence** — what a learner can do alone versus only with support. Shown to learners as plain language ("you understand this with guidance," "you can solve this independently," "revision is now due"), never a raw score or the formula. Bayesian / IRT-style estimation over the evidence underneath.
- **The ten learning-gap types**, each firing a different intervention: prerequisite, conceptual, procedural, application, retention, language, accuracy, speed, confidence, support-dependency. A gap is never confirmed from one bad answer — validated against a pattern first.
- **Adaptive explanation.** The system infers *why* a specific wrong answer happened and adapts — never one explanation repeated louder. When it identifies the broken mental model it surfaces the what-if misconception and, where warranted, detonates it (§10).
- **What the AI learns.** Time-on-item and performance-per-item across the course build each learner's cognitive fingerprint — pace, hesitation, which formats land — which conditions everything Wobo does.
- **The Evidence Graph.** Every conclusion links to the evidence that produced it; no permanent conclusion from a single interaction; every insight carries source lineage and recalculates when permissions change (also the DPDP-clean trust layer).
- **Honest memory — FSRS spaced retrieval** against the real forgetting curve, reviewing when memory is genuinely fading. Never Duolingo guilt. A detonated misconception is scheduled for re-testing.
- **The knowledge twin.** The learner's queryable map of their own cognition — "what am I weakest at," "what unlocks astrophysics" — showing not just lit versus dark but **independent versus support-dependent** mastery. The product's signature icon; see `DESIGN.md`.
- **The assistance-mode ladder:** Learn → Coach → Hint → Work-with-me → Check-my-work → Challenge → Assessment ("show me → … → let me do it independently"). Support visibly fades as mastery grows.
- **The agent-permission ladder:** Recommend → Prepare → Execute-with-permission → Safe-automatic. Comms, purchases, submissions, and deletions always need explicit approval, plus parent controls for minors.
- **The agentic loop:** Observe → Interpret → Plan → Act → Verify → Reflect → Remember.
- **Prerequisite unlocking is dynamic and suggestive.** Dependency-based unlocking is scoped to where the learner started — a learner who begins in grade 10 is never sent back to grade 9; only intra-scope prerequisites gate. And a gate is a suggestion with a "proceed anyway" door, never a wall.
- **XP.** Learners gain XP on item completion, boss-battle victory, account creation, profile photo, inviting friends and parents, mystery and bonus lessons. XP is the visible progress currency; mastery is the truth underneath.

## 9. The psychology engine — mechanism → how it lives in product

- **Freemium via a daily learning budget** metered by concepts mastered, not time, with no visible clock. The limit is a lifecycle dial (loose early for word-of-mouth, tightens as the base grows) and bites **after** the aha, never before. The exact threshold is the single most important number — tune it, never guess.
- **Cliffhanger cap** (Zeigarnik + peak-end + variable anticipation): stop one step before the reveal; the cap is a save point and the conversion moment, not a wall.
- **Endowed progress** (diagnostic credits what they know; the map opens already lit) + **goal-gradient** (many short ~80%-done arcs).
- **Identity over motivation** — convert fleeting motivation into durable identity in the first ~2 weeks. "Learners." Identity streaks ("24 days of being a learner"). Milestones as titles of self.
- **Build-don't-watch** (generation effect + productive failure): pose → struggle → reveal, never explain-first; predict-then-check sims, drag-to-assemble proofs, fill-the-missing-step, teach-it-back to Wobo (protégé effect); scaffolding visibly fades (ZPD).
- **Two share loops:** challenge loop (share hard problems, never answers; WhatsApp-native) for acquisition; proof loop (a beautiful branded mastery artifact) for credibility. Referrals reward in learning, not cash.
- **Wanting vs. liking:** weeks 1–2 maximize anticipation (wanting); from week 3 every session must deliver real satisfaction (liking) or wanting curdles into anxiety. The ratio inverts across the first month — the slot-to-ritual crossover at the neural level.
- Plus: curiosity / information-gap as master drive; Hook model (Investment — attempts train the model, use-improves-product = switching cost); honest loss aversion (real forgetting curve, never guilt); ethically-bounded variable reward (content, never loot boxes); aesthetics as psychology (processing fluency — premium feel makes learning feel achievable, load-bearing).

## 10. Crown-jewel mechanics — first-in-category, defensible

- **Misconception detonation** — name the broken mental model, generate the demolishing counterexample from the learner's own numbers. Flagged in FSRS for re-testing.
- **Earn-it-forward** — a learner's effort funds sponsored free seats, seen landing ("your streak funded a week for a student in Warangal"); felt not claimed; CSR-fundable; defended by the anti-abuse layer.
- **Teach-to-unlock + protégé UGC economy** — pass by teaching Wobo; great explanations curated into content others see (moderated before any learner sees them).
- **Free-reasoning as primary input** — the keystone that makes the above possible.
- **"Written for you" live problems** — personalization as scarcity.
- **The conversational knowledge twin** — query your own cognition; independent vs. support-dependent.
- **Anti-streak** — celebrate planned rest; the contrarian, ownable, scientific line.
- **Sanctioned rabbit holes** — Plexus bridges from where you stand to any concept that fascinates you.
- **Synthesis boss battles** — a live problem assembled from everything you know, across topics via the graph.
- **Velvet-rope invite-only launch** — manufacture demand and status around a free mission product, with an earned-secret / insider-lore layer that drives status-based sharing.

## 11. Category & positioning

- **We are not edtech. We are cognitive fitness — a gym for the mind.** A gym is a ritual, aspirational not remedial, premium without apology, identity-forming. The daily budget is a workout, not a paywall. "I did my Wobo" sits in the same mental slot as "I went to the gym." This reframe governs everything downstream.
- **The five-year endgame is a trusted mastery credential, not a subscription** — assessment backed by free-reasoning evaluation that parents, colleges, and eventually employers trust (the Duolingo-English-Test / credit-score pattern). Plant the flag early even if it activates later; let it shape every assessment decision now.

## 12. Business, growth, retention

- **Adaptive Tactic Engine** — six archetypes detected in week one and continuously re-scored, each with distinct levers and conversion moment: Competitor (rank / status), Mastery-Seeker (depth; suppress leaderboards), Exam-Anxious (structure / calm; never add fear), Ritualist (daily loop / streaks), Belonger (cohorts / teaching), Dabbler (delight; never push). The engine selects notification copy, reward type, paywall framing, and timing per person, on the same data that trains Plexus. It adapts framing, copy, and timing — **never price.** Uniform pricing for all; archetype-based price discrimination is a PR landmine and an explicit ethical rail.
- **Slot-machine-to-ritual** — slot machine onboards (fast capture); ritual retains (renewals). Spike to onboard, never to retain — the line that keeps us not Byju's.
- **Sell the future, not fear** (~80% aspiration). Three honest, closeable gaps: capability (the version of you that mastered it — the twin, future-pacing), status (velvet rope), peer (someone just ahead — pulls, doesn't demoralize). Always show the next self, visible and close.
- **Monetization** — decoy-structured tiers; annual-first (banks cashflow, lifts LTV); charm pricing; never discount — **gift** instead; "unlimited weekends" to taste-then-lose unlimited; conversion fires at the emotional peak, never on a timer. **Surprise generosity:** learners with strong streaks and real mastery are granted free premium for days or weeks, unannounced — reward the ones who genuinely want to learn; the surprise is the gift. The subscription ask itself is behaviour-timed: it lands just before the wow moment it would unlock, framed as pushing limits, never as a necessity — and its timing varies per user.
- **The parent surface is an absolution engine, not a dashboard.** Indian parents buy the relief of duty done and visible proof their sacrifice works. A weekly, beautiful, WhatsApp-native artifact from the child's own learning — a visual projection of who the learner is becoming, as a short video, a shareable page, or a graph, in the parent's language — converts anxiety into pride (renewable monthly, zero coercion). Let the child trigger "show mom what I just cracked," wiring renewal into a love relationship, not a fear one. Notifications are timed to genuine progress moments, not a schedule.
- **WhatsApp is a surface where the product partly lives**, not a notification channel: daily challenge attemptable in-thread, Wobo conversable where the learner already lives, the install-and-onboard cliff collapsed to near zero.
- **Growth loops** — velvet rope; near-zero-CAC challenge loop; B2B2C both directions (Wobo feeds the Classess School sale; schools resell seats); cross-subsidy social model (paid + CSR fund free seats via earn-it-forward); seasonal exam-calendar surges. **Data flywheel** underneath everything — every attempt and hesitation sharpens Plexus and the personalization / churn models. **Build in public** as an acquisition engine — the solo-founder-plus-AI flagship story earns the creator / educator audience Brilliant spent a decade buying.

## 13. AI, infra, admin

- **Own LLMs / SLMs behind a model-agnostic router**, scattered wherever needed (frontier for hard generation, small specialized SLMs at edge / offline) — margin control and moat. Routing: Fable 5 orchestrates; Opus 4.8 generates heavy content; Gemini for voice; Google TTS for video and podcast narration; Gemini / Nano Banana for complex imagery SVG cannot express; small / edge SLMs for personalization and classification (the Track-2 slot).
- **Super admin = god-mode** visibility and control — every user, metric, marketing dial, adaptive-engine dial, cap threshold, pricing lever, content pipeline, live experiment, and data control in one cockpit — on tiered access, immutable audit, and break-glass. The most powerful surface must be the best-governed.
- **The omniscient brain** — natural-language-queryable, predictive (not just descriptive) understanding of any user, cohort, or pattern, riding the event lake + feature store + behavioural embeddings + knowledge graph, governed by the age / consent doors.
- **"AI-native" redefined** = intelligence as the substrate: content generated not stored, users understood not recorded, experiences adapted per-person not templated, the system learning retroactively across every app and event. We set this definition and prove it.

## 14. Tech stack — all first-class, fully built, no stubs

Supabase (Postgres + Auth [phone / OTP-first, Google / Apple] + Realtime + pgvector + Storage) · FastAPI orchestration + multi-model router (LiteLLM) · free-reasoning eval + misconception classifier · Plexus engine set + RAG on catalogs · FSRS spaced repetition + Bayesian / IRT mastery · Redis (budget meter, leaderboards, session) · Expo (React Native) offline-first + React web / PWA · Rive + Lottie + Framer Motion + JSXGraph + Mafs + Three.js / R3F · Razorpay + Apple / Google IAP + Stripe · Resend + WhatsApp Cloud API + push via one trigger layer (Knock / OneSignal) + n8n lifecycle orchestration · PostHog (analytics + flags + experiments — every lever flaggable and A/B-testable) · Langfuse (LLM observability) · Sentry · Infisical (secrets, environment variables only) · Vercel + Railway / Render · CI/CD via the GitHub org. Offline-first reconciles with live generation by pre-syncing FSRS-scheduled learning packs and edge SLMs for offline eval.

## 15. The conscience layer — adopt and fuse, do not follow blindly

From the pedagogy / ethics vision docs: the Personal Academic OS / one-next-best-action Today spine; the assistance-mode ladder; academic-integrity-by-design + the AI Contribution Record; the Evidence Graph; the evidence-weighting mastery model; the ten learning-gap types feeding which intervention fires; source attribution on every insight (lineage + recalculate-when-permissions-change); the agent-permission ladder + parent controls for minors; "optimize for outcomes not screen time" (go offline, write on paper, take a break); the agentic loop; the academic ontology; multimodal "ask or do anything" + code-switching multilingual; "roles not apps" with the institution hierarchy so Wobo interoperates cleanly with Classess School across KGtoPG.

## 16. The central tension — thread it, never resolve it by abandonment

The conscience docs describe a calm, dependency-reducing academic OS; our engine is habit-forming and growth-driven. Reconcile by one rule: **engineer compulsion only toward the behaviours that make the learner independent** — mastery, retrieval, independent attempts — so habit and integrity are the same loop. Never resolve the tension by abandoning either side. The moment a mechanic would make a learner more dependent on us rather than more capable on their own, it fails the rule and does not ship.

## 17. Working rules

At the start of every task, silently check available skills and load the relevant ones (brand, catalogs, schemas, rubrics); flag missing skills worth building. Never narrate tool or skill mechanics. Never reproduce real pricing — dummy values only. Build nothing until Shreyan gives an explicit command; when he is sharing vision or context, register and wait. Hold everything at ecosystem altitude: the ecosystem is the entity, KGtoPG and the apps are citizens.
