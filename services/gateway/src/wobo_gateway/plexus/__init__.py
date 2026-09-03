"""Plexus — the content engines behind the ``engine.*`` capabilities.

Four engines on the capability router: compose (guided-discovery card outlines),
simulate (CAS-verified sim specs), diagram (sanitized inline SVG), video
(motion-scene JSON with optional Gemini TTS narration).

Every artifact is verified before serving; a live refusal or failed verification
falls back to a deterministic seed (invisible to the learner). Every artifact is
cached under ``content/cache/`` keyed (concept x modality x difficulty) and carries
provenance ``{engine, model, prompt_version}``.
"""

from wobo_gateway.plexus.engines import (
    INTERNAL_GENERATION,
    ConceptRejected,
    GenerationBusy,
    GenerationUnattributed,
    run_engine,
)

__all__ = [
    "INTERNAL_GENERATION",
    "ConceptRejected",
    "GenerationBusy",
    "GenerationUnattributed",
    "run_engine",
]
