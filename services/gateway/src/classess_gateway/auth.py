"""Identity at the door — every learner-facing call carries a verified Supabase JWT.

One seam: :func:`authenticate` turns a request into a :class:`Principal` or raises
:class:`AuthError`. Everything downstream (consent tier, budget, rate limit, voice tokens)
keys off ``principal.subject`` and never off anything the client asserts about itself.

Two verification paths, chosen by the token's own ``alg`` header:

* ``HS*`` — the legacy Supabase project secret, ``SUPABASE_JWT_SECRET``.
* ``RS*`` / ``ES*`` / ``EdDSA`` — the project's JWKS at ``SUPABASE_JWKS_URL`` (default
  ``<SUPABASE_URL>/auth/v1/.well-known/jwks.json``), cached for ten minutes.

The algorithm allowlist is closed on purpose: a token may not talk us into ``none``, and an
``HS`` token can never be verified against a public key (the classic confusion attack).

The dev seam (``X-Wobo-Dev-Subject``) exists so local development and the test suite do not
need a Supabase project. It requires an explicit ``DEV_AUTH=1`` and is refused outright when
``ENV=prod`` — see ``app.validate_env``, which also refuses to boot prod without a secret or
a JWKS URL. It is never inferred from a default.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any

# Supabase signs with HS256 (legacy) or RS256/ES256 (current). Nothing else is accepted, and
# "none" is not in the map at all — an attacker cannot downgrade a token into an unsigned one.
_SYMMETRIC_ALGS = frozenset({"HS256", "HS384", "HS512"})
_ASYMMETRIC_ALGS = frozenset({"RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "EdDSA"})

_JWKS_TTL_S = 600.0
_HTTP_TIMEOUT_S = 5.0
_MAX_DEV_SUBJECT = 128

# url -> (fetched_at_monotonic, document). One process, a handful of URLs; never grows.
_jwks_cache: dict[str, tuple[float, dict[str, Any]]] = {}


class AuthError(Exception):
    """A request that may not proceed. Wobo-voiced, never naming a provider or a library."""

    def __init__(
        self,
        message: str = "Sign in and we can pick up right where you left off.",
        *,
        code: str = "sign_in_required",
        status: int = 401,
    ) -> None:
        self.code = code
        self.status = status
        self.message = message
        super().__init__(message)

    def body(self) -> dict[str, str]:
        return {"code": self.code, "message": self.message}


@dataclass(frozen=True)
class Principal:
    """Who is calling, as the gateway verified them — never as the client described itself."""

    subject: str
    anonymous: bool = False
    claims: dict[str, Any] = field(default_factory=dict)


def dev_auth_enabled() -> bool:
    """The dev seam is open ONLY off prod and ONLY under an explicit ``DEV_AUTH=1``.

    It used to open itself whenever ``LLM_MODE`` was mock — and both ``ENV`` and ``LLM_MODE``
    default to the permissive value, so any deploy that forgot ``ENV=prod`` accepted a header
    as proof of identity (impersonation, plus whatever tier that subject's record carries).
    A seam that asserts an identity with no proof must be switched on deliberately, never
    inferred from an unrelated default.
    """
    if os.getenv("ENV", "dev").lower() == "prod":
        return False
    return dev_auth_requested()


def dev_auth_requested() -> bool:
    """Is ``DEV_AUTH`` switched on at all, prod or not? ``validate_env`` refuses this in prod.

    ``.env.example`` writes ``DEV_AUTH=true`` and the contract says ``DEV_AUTH=1``; both mean the
    same thing to an operator, so both are read the same way. A value we do not recognise is off.
    """
    return (os.getenv("DEV_AUTH") or "").strip().lower() in {"1", "true", "yes", "on"}


def jwks_url() -> str | None:
    """Where the project publishes its public keys, explicit or derived from SUPABASE_URL."""
    explicit = os.getenv("SUPABASE_JWKS_URL")
    if explicit:
        return explicit
    base = os.getenv("SUPABASE_URL")
    if not base:
        return None
    return f"{base.rstrip('/')}/auth/v1/.well-known/jwks.json"


def expected_audience() -> str:
    return os.getenv("SUPABASE_JWT_AUD", "authenticated")


def _fetch_jwks(url: str) -> dict[str, Any]:
    """Read the key set over HTTPS. Split out so tests can substitute it without a network."""
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=_HTTP_TIMEOUT_S) as response:  # noqa: S310
        document = json.loads(response.read().decode())
    if not isinstance(document, dict) or not isinstance(document.get("keys"), list):
        raise ValueError("jwks document has no key list")
    return document


def _jwks(url: str, *, force: bool = False) -> dict[str, Any]:
    """Cached key set. A failed refresh serves the stale copy rather than locking everyone out."""
    cached = _jwks_cache.get(url)
    fresh = cached is not None and (time.monotonic() - cached[0]) < _JWKS_TTL_S
    if cached is not None and fresh and not force:
        return cached[1]
    try:
        document = _fetch_jwks(url)
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        if cached is not None:
            return cached[1]
        raise AuthError("I could not check your sign-in just now. Try that again.") from exc
    _jwks_cache[url] = (time.monotonic(), document)
    return document


def reset_jwks_cache() -> None:
    """Test seam — drop the cached key sets."""
    _jwks_cache.clear()


def _signing_key(kid: str | None, alg: str) -> Any:
    import jwt  # lazy: keeps import cost off the paths that never verify a token

    url = jwks_url()
    if not url:
        raise AuthError()
    for force in (False, True):  # a rotated key is one refresh away, then it is a real failure
        keyset = jwt.PyJWKSet.from_dict(_jwks(url, force=force))
        for key in keyset.keys:
            if (kid is None or key.key_id == kid) and key.key_type in {"RSA", "EC", "OKP"}:
                return key.key
    raise AuthError()


def verify_token(token: str) -> Principal:
    """Verify a Supabase access token and return the subject it proves. Raises on anything else."""
    import jwt

    if not token:
        raise AuthError()
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        raise AuthError() from exc

    alg = str(header.get("alg") or "")
    if alg in _SYMMETRIC_ALGS:
        secret = os.getenv("SUPABASE_JWT_SECRET")
        if not secret:
            raise AuthError()
        key: Any = secret
    elif alg in _ASYMMETRIC_ALGS:
        key = _signing_key(header.get("kid"), alg)
    else:
        raise AuthError()

    try:
        claims = jwt.decode(
            token,
            key,
            algorithms=[alg],
            audience=expected_audience(),
            options={"require": ["exp", "sub"], "verify_aud": True, "verify_exp": True},
        )
    except jwt.PyJWTError as exc:
        raise AuthError() from exc

    subject = str(claims.get("sub") or "")
    if not subject:
        raise AuthError()
    return Principal(
        subject=subject,
        anonymous=claims.get("is_anonymous") is True,
        claims=claims,
    )


def _bearer(header_value: str | None) -> str | None:
    if not header_value:
        return None
    scheme, _, token = header_value.partition(" ")
    if scheme.lower() != "bearer":
        return None
    return token.strip() or None


def authenticate(headers: Any) -> Principal:
    """The one door. ``headers`` is any case-insensitive mapping (Starlette's Headers)."""
    token = _bearer(headers.get("authorization"))
    if token:
        return verify_token(token)

    if dev_auth_enabled():
        subject = (headers.get("x-wobo-dev-subject") or "").strip()[:_MAX_DEV_SUBJECT]
        if subject:
            anon_header = headers.get("x-wobo-dev-anonymous") == "1"
            anonymous = anon_header or subject.startswith("anon")
            return Principal(subject=subject, anonymous=anonymous, claims={"dev": True})

    raise AuthError()
