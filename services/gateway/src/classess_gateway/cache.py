"""Typed cache interface and an in-memory implementation.

This is tier 1 of the three-tier cost economy: exact and semantic caches sit in front of
the models. Tier 2 is SLM personalization (Track 2) and tier 3 is frontier bespoke
(Track 1) — both live in routing and are reached only on a cache miss.

The in-memory backend is for dev and tests. Redis replaces it later behind the same
:class:`CacheBackend` protocol; pgvector adds true semantic similarity behind the same
``CacheTier.SEMANTIC`` path.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Protocol


class CacheTier(StrEnum):
    EXACT = "exact"
    SEMANTIC = "semantic"
    NONE = "none"


@dataclass(frozen=True)
class CacheEntry:
    output: dict[str, Any]
    model: str
    tokens: int


def cache_key(capability: str, payload: dict[str, Any]) -> str:
    body = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(f"{capability}\x00{body}".encode()).hexdigest()
    return f"{capability}:{digest}"


class CacheBackend(Protocol):
    def get(self, key: str, tier: CacheTier) -> CacheEntry | None: ...
    def set(self, key: str, entry: CacheEntry, tier: CacheTier) -> None: ...


class InMemoryCache:
    """Exact-match cache.

    ponytail: ``SEMANTIC`` falls back to exact-key lookup until a vector backend exists.
    Swap pgvector similarity in here — callers and policies do not change.
    """

    def __init__(self) -> None:
        self._store: dict[str, CacheEntry] = {}

    def get(self, key: str, tier: CacheTier) -> CacheEntry | None:
        if tier is CacheTier.NONE:
            return None
        return self._store.get(key)

    def set(self, key: str, entry: CacheEntry, tier: CacheTier) -> None:
        if tier is CacheTier.NONE:
            return
        self._store[key] = entry
