"""Plexus content engines.

Each engine generates one content modality (image, diagram, sim, ...), verifies it,
and caches the verified artifact with provenance. Engines self-describe via an ``ENGINE``
descriptor so the Plexus registry can wire them without importing internals.

ponytail: kept an empty package marker — the skeleton (engine registry, shared base) is
built in parallel. Engines are imported directly (``classess_gateway.plexus.image``) until
that lands; nothing here to collide over.
"""
