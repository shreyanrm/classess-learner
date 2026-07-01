"""Confidence gate and verification hashing — the decision substrate.

Combines the deterministic verdict (CAS / numeric / simulator checks) with an optional
second-model cross-check into a single confidence in ``[0, 1]``, then decides whether to
serve. Deterministic proof is authoritative: a passing CAS check IS proof, so it pins
confidence to 1.0; the cross-check is only decisive when no deterministic check applies
(non-deterministic content). Anything that cannot clear the threshold is refused, and the
caller falls back to cached verified content.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any

from .crosscheck import CrossCheckResult

VERSION = "v1"
DEFAULT_THRESHOLD = 0.7


@dataclass(frozen=True)
class CheckResult:
    """One deterministic check. ``passed`` is the whole story; ``detail`` is for humans."""

    name: str
    passed: bool
    detail: str = ""


@dataclass(frozen=True)
class Verdict:
    verified: bool
    action: str  # "serve" when verified, "refuse" otherwise
    confidence: float
    method: str
    checks: list[CheckResult]
    verification_hash: str | None = None
    fallback: str | None = None


def confidence(checks: list[CheckResult], cross: CrossCheckResult | None = None) -> float:
    """Confidence in ``[0, 1]`` that the content is correct.

    A single failed deterministic check is disqualifying. Passing deterministic checks are
    a proof (1.0). With no deterministic checks, lean on the cross-check; with neither, we
    have verified nothing and return 0.0.
    """
    if any(not c.passed for c in checks):
        return 0.0
    if checks:
        return 1.0
    if cross is None or not cross.agrees:
        return 0.0
    return max(0.0, min(1.0, cross.confidence))


def _normalize(value: Any) -> Any:
    """Canonicalize content so trivial formatting noise does not change the hash."""
    if isinstance(value, str):
        return " ".join(value.split())
    if isinstance(value, dict):
        return {k: _normalize(value[k]) for k in sorted(value)}
    if isinstance(value, (list, tuple)):
        return [_normalize(v) for v in value]
    return value


def verification_hash(content: Any, method: str, version: str = VERSION) -> str:
    """Stable, deterministic hash of normalized content + method + version.

    The content cache is keyed by this, so it must be reproducible across processes.
    """
    payload = json.dumps(
        {"content": _normalize(content), "method": method, "version": version},
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def decide(
    *,
    content: Any,
    method: str,
    checks: list[CheckResult],
    cross: CrossCheckResult | None = None,
    threshold: float = DEFAULT_THRESHOLD,
    version: str = VERSION,
) -> Verdict:
    """Verify or refuse. Refusal carries the cached-verified fallback and no hash."""
    conf = confidence(checks, cross)
    verified = conf >= threshold and not any(not c.passed for c in checks)
    if not verified:
        return Verdict(
            verified=False,
            action="refuse",
            confidence=conf,
            method=method,
            checks=list(checks),
            verification_hash=None,
            fallback="cached_verified",
        )
    return Verdict(
        verified=True,
        action="serve",
        confidence=conf,
        method=method,
        checks=list(checks),
        verification_hash=verification_hash(content, method, version),
    )
