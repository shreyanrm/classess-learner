# 06 · Create-Anything Flow

**WHEN:** learner uses the create door ("learn anything") — a self-defined topic, not in the template tree.
**WHERE:** the Create surface → compiles into the same Learn loop.
**WHY:** the retention engine and the moat. Two entry doors, **one ontology machine**: anything a learner wants becomes a verified,
ontology-mapped sequence, taught by the same loop. Learner-defined goals are the strongest motivation.

**WHAT (steps):**
1. **Request** — learner describes what they want to learn (free text / voice). Child-safety moderation on the input.
2. **Compile** — **Plexus** generates a course grounded on the catalogs; the request is **mapped onto the ontology** (existing nodes reused,
   new nodes proposed and verified). Output: a `course_id` + an ordered node sequence with prereqs.
3. **Verify** — every generated node's content passes the **verifier** before it can be served. Unverifiable → not served.
4. **Place** — the learner is positioned on the new sub-graph using any existing mastery (endowed progress where prereqs already glow).
5. **Teach** — hand off to the standard Learn loop. From here it is indistinguishable from a template course (same mastery, same ignite).

**HOW:** Plexus RAG over NCERT-grounded corpus + ontology mapping service in KGtoPG; verifier gate; content cached by verification hash.
**EVENTS:** `create.request.submitted.v1`, `create.course.compiled.v1`, `create.node.mapped.v1`, then standard learn events.
**AI CALLS:** `plexus.compile`, `ontology.map`, `verify.*`, `safety.moderate`.
**STATES:** request · moderating · compiling · verifying · placed · teaching · (unverifiable→graceful fallback/refusal).
**GUARDRAILS:** sole content source is Plexus (no static banks); nothing served unverified; simulators/mini-games only from parametric
pre-verified templates; moderation before any generation acts on input.
