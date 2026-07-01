"""Classess model gateway: the single entry for all model calls.

Features call a capability name (e.g. ``tutor.turn``), never a raw model. The gateway
resolves the capability to a routing policy, applies consent-tier gating, walks the
three-tier cost economy (cache -> SLM -> frontier), and emits telemetry. Track 1
(external market LLMs) and Track 2 (proprietary fine-tuned + edge SLMs) are kept in two
separate config structures and are never conflated.
"""

from __future__ import annotations

__version__ = "0.0.0"
