"""The universal curriculum (docs/CURRICULUM.md).

The registry of every board on earth, the ontology under it, the learner's overlay on top of it,
and the nine capabilities that serve all three. Nothing in this package calls a model: discovery
does, and it runs behind ``discovery_jobs``.

Import the pieces from their own modules — ``api`` for the capability surface, ``store`` for the
registry itself, ``models``/``labels``/``versions``/``overlay`` for the rules. Only the two names
the gateway itself needs are re-exported here, so app.py stays a one-line mount.
"""

from __future__ import annotations

from wobo_gateway.curriculum.api import CAPABILITIES, CurriculumError, handle

__all__ = ["CAPABILITIES", "CurriculumError", "handle"]
