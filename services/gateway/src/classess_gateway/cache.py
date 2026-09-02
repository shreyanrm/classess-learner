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
import logging
import os
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Protocol

logger = logging.getLogger("classess.gateway.cache")


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


# Bounds for the in-process cache. An unbounded dict on a long-lived process is a memory leak
# with a friendly name: a video artifact is megabytes, and one key per learner payload never
# stops growing. Three bounds, any of which evicts: entry count, total bytes, and age.
_DEFAULT_MAX_ENTRIES = 512
_DEFAULT_MAX_BYTES = 64 * 1024 * 1024  # 64 MB of cached outputs, process-wide
_DEFAULT_TTL_S = 3600.0


def _env_int(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, "") or default)
    except ValueError:
        return default
    return value if value > 0 else default


def _entry_bytes(entry: CacheEntry) -> int:
    """The entry's weight. JSON length is the honest proxy — it is what a Redis backend would
    store, so the ceiling means the same thing before and after that swap."""
    try:
        return len(json.dumps(entry.output, default=str).encode())
    except (TypeError, ValueError):
        return 0


class InMemoryCache:
    """Exact-match cache, bounded by entries, bytes and age, LRU on eviction.

    ponytail: ``SEMANTIC`` falls back to exact-key lookup until a vector backend exists.
    Swap pgvector similarity in here — callers and policies do not change. The ceiling is one
    process: bounds are per instance and nothing is shared between them. Redis behind the same
    :class:`CacheBackend` protocol is the upgrade path (its own maxmemory-policy then owns the
    eviction), at which point these dials become the fallback for single-instance dev.
    """

    def __init__(
        self,
        max_entries: int | None = None,
        max_bytes: int | None = None,
        ttl_s: float | None = None,
    ) -> None:
        self.max_entries = max_entries or _env_int("CACHE_MAX_ENTRIES", _DEFAULT_MAX_ENTRIES)
        self.max_bytes = max_bytes or _env_int("CACHE_MAX_BYTES", _DEFAULT_MAX_BYTES)
        self.ttl_s = float(ttl_s or _env_int("CACHE_TTL_SECONDS", int(_DEFAULT_TTL_S)))
        # value: (entry, stored_at, size_bytes). OrderedDict IS the recency order.
        self._store: OrderedDict[str, tuple[CacheEntry, float, int]] = OrderedDict()
        self._bytes = 0
        # FastAPI runs sync routes on a threadpool and the plexus validation gate runs its own
        # threads, so every mutation is guarded.
        self._lock = threading.Lock()

    def get(self, key: str, tier: CacheTier) -> CacheEntry | None:
        if tier is CacheTier.NONE:
            return None
        with self._lock:
            found = self._store.get(key)
            if found is None:
                return None
            entry, stored_at, size = found
            if time.monotonic() - stored_at > self.ttl_s:
                del self._store[key]
                self._bytes -= size
                return None
            self._store.move_to_end(key)  # touched: now the most recently used
            return entry

    def set(self, key: str, entry: CacheEntry, tier: CacheTier) -> None:
        if tier is CacheTier.NONE:
            return
        size = _entry_bytes(entry)
        with self._lock:
            if size > self.max_bytes:
                # One artifact bigger than the whole budget would evict everything else and then
                # sit there. Serve it, do not cache it — the file cache under content/ holds the
                # heavy artifacts anyway.
                logger.debug("cache: entry too large to store", extra={"fields": {"key": key}})
                return
            old = self._store.pop(key, None)
            if old is not None:
                self._bytes -= old[2]
            self._store[key] = (entry, time.monotonic(), size)
            self._bytes += size
            self._evict()

    def _evict(self) -> None:
        """Drop least-recently-used entries until both ceilings hold. Caller holds the lock."""
        while self._store and (len(self._store) > self.max_entries or self._bytes > self.max_bytes):
            _, (_, _, size) = self._store.popitem(last=False)
            self._bytes -= size

    def __len__(self) -> int:
        return len(self._store)

    @property
    def nbytes(self) -> int:
        return self._bytes
