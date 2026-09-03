# SITE.md — the public site: map, navigation, and how every page pitches

Owner brief (2026-09-03): "a lot of internal pages explaining everything in detail; every page pitches in its own way; the top navbar planned accordingly; a security page for all our compliances and data security, so viewers have full confidence." Reference for the scroll and chapter feel: groundreality.ai (GSAP ScrollTrigger + Lenis, pinned numbered chapters, one drawn artefact per chapter, disciplined spacing). Visual law: DESIGN.md (bold ink on good paper, palette v4). Prototype of the home page: `scratchpad/design/landing-v6.html`.

## 1. Navigation

**Top bar.** Wordmark · Meet Wobo · How it works · For parents · For students · Subjects ▾ (Mathematics, Science, Social science, English) · Plans · | · Sign in · Get started.

**Footer.** Wobo (Meet Wobo, How it works, Subjects, Plans, Gift Wobo) · For (Parents, Students, Schools) · Help (Help centre, Contact, Questions) · Company (About, Security and trust, Terms, Privacy, Children's privacy, Cookies, Accessibility).

Every page shares the site shell (header, footer, cursor ribbon, depth layer, Lenis scroll), the spacing scale, and the rule that the mechanism is never explained ("every board on demand" stays a secret; pages say "it teaches what your school teaches").

## 2. Pages, and how each one pitches

Every page is a pitch with its own angle, told through scenes rather than feature lists, and ends with "Begin tonight". Each page has: a hero with one drawn artefact, two or three pinned or scrolled chapters, an interactive moment where it fits, an Ask Wobo section near the end, and the close panel.

| Route | Angle | Hero artefact | Chapters | Interactive moment |
|---|---|---|---|---|
| `/` | The Tuesday night | live drawing card + Wobo | 9:40 pm chapter · she tries one · Sunday note · on anything · subjects · parents · ask · questions · devices | the half-square puzzle, Ask Wobo |
| `/meet-wobo` | Who Wobo is, the character and the voice | Wobo large, blinking, following the pointer; the first-meeting line written | how it listens (voice + typed + circle) · how it draws (pen, board, plane, full board) · how it notices (praise, gaps, the note) · what it never does (no shaming, no opinions, no ads) | say "Hey Wobo" (hold space demo, mock) |
| `/how-it-works` | A lesson from first question to Sunday note | the three-step strip drawn | ask · drawn out · try one · practice that rings the gap · the week · the parent view | a second answer kind (drag the point on the graph) |
| `/for-parents` | Peace of mind and a tutor at any hour | the Sunday note with the envelope | the 8 pm drive · what you see (parent view) · safe by design · what it costs (link to plans) · the questions parents ask | Ask Wobo (parent questions) |
| `/for-students` | It never makes you feel small | the film with the lasso | ask the basic thing · it draws, it doesn't lecture · it rings the gap · it notices when you nail it · your streak, your way | the puzzle plus a "draw the angle" moment |
| `/subjects` | Every subject, your school's way | the four subject tiles as drawn objects | one chapter per subject with its own drawn lesson (Pythagoras, benzene, a map that is drawn per the learner's own government, a paragraph marked up) | the subject objects morph on scroll (the raymarched prism → benzene → planet) |
| `/subjects/mathematics` etc. | One subject, from class 4 to 12 | the subject's own object | what class 4 sees · what class 9 sees · what class 12 sees · the kind of practice · the note a parent gets | one answer kind native to the subject |
| `/plans` | Free every day; more when exams get close | the allowance widget drawn | free vs pro vs max, honest table · the two consent checkboxes at checkout · the gift | the plan picker |
| `/gift` | The smartest gift | a wrapped note | who it's for · what they get · how it arrives | choose a gift card |
| `/schools` | For a class, not a child (later) | a classroom board | the teacher's view · the syllabus pinned · privacy for a school | contact form |
| `/about` | Why we built it | the mission line in Wobo's hand | how Wobo teaches · what we cover · our promises · the team | Ask Wobo about us |
| `/security` | Full confidence: what we hold, how we protect it, who can see it | a drawn shield with Wobo's eyes | data we collect and why · where it lives and how it is protected (encryption in transit and at rest, access control, keys, backups, incident response) · children's data and consent (DPDP, COPPA, GDPR) · what we never do (sell, track across the web, train on your child without consent, show ads) · who can see what (learner, parent, staff, the audit trail) · third parties as categories · compliance posture and the road to certifications (stated honestly: which controls are in place today, which audits are scheduled) · how to report a concern · sub-processor list and change notice | request the security overview (email form) |
| `/help`, `/help/<group>/<slug>` | Answers first | the group's ink mark | article · next · Ask Wobo about this | Ask Wobo |
| `/contact` | A person answers | the letter | form · response promise | form |
| `/legal/*` | The set, plain-worded | the "in plain words" card | document | — |
| states (404, 500, offline, limit, expired, maintenance) | Wobo present, never a dead end | the ink scenes from `states-v2.html` | — | — |

## 3. The security page, in detail

Written for a parent, a school IT lead and a journalist at once. Sentence case, no jargon without a one-line gloss, no claim we cannot show. Sections:

1. **The short version.** Five lines: what we collect, why, where it lives, who sees it, how to delete it.
2. **What we collect and why.** Account (email, name, class, board), learning data (questions, answers, drawings, progress), voice (processed for the turn, not stored unless the family opts in), payment (handled by the payment provider, never stored by us), device and usage (for reliability, no advertising identifiers). Each row: purpose, retention, how to delete.
3. **Where it lives and how it is protected.** Regions, encryption in transit (TLS 1.2+) and at rest, key management, least-privilege access, audit logs, backups and restore tests, secure development (reviews, dependency scanning, secrets never in code), incident response with notification windows.
4. **Children first.** Consent flows by age and jurisdiction (DPDP Act 2023 verifiable parental consent, COPPA under 13, GDPR-K), the parent view, the erase-everything button, no profiling for advertising, neutral content rules (plan §20).
5. **Who can see what.** A table: learner, parent, school (if linked), Wobo staff (break-glass with logging), third-party processors by category.
6. **What we never do.** Sell data, track across the web, show ads, vary prices by behaviour, use dark patterns, train models on a child's data without explicit consent.
7. **Compliance posture.** Today: the controls above. Scheduled: independent penetration test, SOC 2 Type I then Type II, ISO 27001 readiness; kidSAFE-style seal evaluated. Dates only when they are real.
8. **Sub-processors.** Categories with regions and the change-notice promise.
9. **Report a concern.** security@heywobo.com, a responsible-disclosure promise, a 72-hour acknowledgement.
10. **Documents.** Privacy policy, children's privacy, terms, DPA on request, the data-flow diagram drawn in ink.

## 4. Build order

1. Home (landing v6) ported into the app with the shell, the scroll engine and the ribbon; every public page adopts the shell.
2. Meet Wobo, How it works, For parents, For students, Subjects (+ four subject pages), Security: designed as prototypes by Fable from this map, then built by workers with the copy from `docs/copy/**` extended per page.
3. About, Help, Plans, Gift, Contact, Legal, states: re-skinned to the v4 law (they were built during Wave 7b in the earlier language).
4. Every page: element inventory (§15), three-width proofs in both themes, the copy audit (§19, §20), performance budget.
