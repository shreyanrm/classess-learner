"""The discovery job — every board on earth, on demand (``docs/CURRICULUM.md`` §4 and §9).

A learner names a framework, level and subject we have never stored. Rather than invent one,
the brain goes looking for the board's own document, reads it, turns it into our schema, checks
that reading against the document, and stores the result as ``provisional`` with the source
attached. The next learner from that framework and level is served from the registry and never
triggers a second discovery.

The stages, one module each, each usable on its own and each injectable in tests:

=============  ==========================================================================
:mod:`search`  find candidate documents (the provider's own web-search tool, via the router)
:mod:`fetch`   HTML or PDF to text with page anchors, on a budget, respecting robots
:mod:`extract` the generate tier turns the document into the schema, strict JSON, source_ref
:mod:`verify`  structural checks in code plus the verify tier re-reading the source
:mod:`job`     the state machine, the budgets, idempotency, refusal, and promotion
:mod:`freshness` monthly and release-window re-fetch, hash compare, new version, the diff
=============  ==========================================================================

Three laws bind every module here. **No syllabus without a source** — every node carries a
``source_ref`` into a document we actually fetched. **Refuse rather than invent** — a stage that
cannot do its job honestly ends the run with one plain line and the own-syllabus door, never a
plausible fabrication. **Nothing is edited in place** — a changed document produces a new version
with a ``supersedes`` pointer, never a mutation of the published one.
"""
