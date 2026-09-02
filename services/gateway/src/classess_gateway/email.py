"""Transactional email — Resend REST over stdlib urllib, console by default.

``send_email(kind, to, data)`` renders a template (see ``email_templates``) and, per
``EMAIL_MODE``, either logs the render (``console``, the default, so dev and CI never touch
the network) or sends it through Resend (``live``). It never raises into a caller's flow: a
lifecycle trigger that fails to email must not break the learner's action, so every failure
returns a structured result and a warning log instead.

``register_email(app)`` mounts one internal endpoint — ``POST /v1/email/send`` — gated by an
internal shared-key header that FAILS CLOSED (an unset key refuses every call, so a
misconfigured deploy is a dead endpoint, never an open relay). The recipient is checked too: a
call made on behalf of an authenticated subject may only mail that subject's own address, and a
call with no subject at all (a bare internal key) may only send the fixed lifecycle set. The
consent tier is NEVER read from the request body — it is derived server-side from the subject.
"""

from __future__ import annotations

import json
import logging
import os
import secrets
import urllib.error
import urllib.request
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

from classess_gateway.email_templates import KINDS, render

logger = logging.getLogger("classess.gateway.email")

# Brand-neutral by config (WOBO-PLAN §8): the sender is one environment variable, so the domain
# swap is a deploy change, not a code change.
_FROM = os.getenv("EMAIL_FROM", "Wobo <wobo@mail.classess.com>")
_REPLY_TO = os.getenv("EMAIL_REPLY_TO", "hello@mail.classess.com")
_RESEND_URL = "https://api.resend.com/emails"
_HTTP_TIMEOUT_S = 20.0


def account_email(subject: str) -> str | None:
    """The address on file for a verified subject, or ``None`` when it cannot be established.

    ponytail: the profile lookup lives in one place for the whole gateway (``consent``). The
    profile row carries no address column yet — canonical identity lives in the platform
    plane's vault — so this returns ``None`` today and every caller that passes a subject FAILS
    CLOSED. An unknown address is never mailed on a learner's behalf.
    """
    if not subject:
        return None
    try:
        from classess_gateway.consent import account_email as _lookup  # type: ignore[attr-defined]
    except (ImportError, AttributeError):
        return None
    try:
        found = _lookup(subject)
    except Exception:  # a profile-store outage must not turn into a wrong-recipient send
        logger.warning("email: profile lookup failed", extra={"fields": {"subject": subject}})
        return None
    return str(found) if found else None


def may_send_to(subject: str | None, to: str) -> bool:
    """Is this send allowed? ``subject is None`` means a trusted internal call (the shared key is
    the authority). With a subject, the address must be that subject's own — a learner may mail
    themselves and nobody else."""
    if subject is None:
        return True
    owned = account_email(subject)
    return bool(owned) and owned.strip().lower() == to.strip().lower()


def send_email(
    kind: str,
    to: str,
    data: dict[str, Any] | None = None,
    *,
    subject: str | None = None,
) -> dict[str, Any]:
    """Render ``kind`` and send or log it. Returns a structured result; never raises.

    ``subject`` is the verified learner this send is made on behalf of. When given, the recipient
    must be that learner's own address; omitted, the call is trusted internal lifecycle mail.
    """
    mode = os.getenv("EMAIL_MODE", "console").lower()
    if not may_send_to(subject, to):
        logger.warning(
            "email refused: recipient does not belong to the subject",
            extra={"fields": {"kind": kind, "subject": subject}},
        )
        return {"ok": False, "mode": mode, "error": "not_allowed"}
    try:
        email = render(kind, data or {})
    except KeyError:
        logger.warning("email render skipped: unknown kind", extra={"fields": {"kind": kind}})
        return {"ok": False, "mode": mode, "error": "unknown_kind"}

    if mode != "live":
        # console (default): render is proven, nothing sent — the structured line is the proof.
        logger.info(
            "email rendered (console mode, not sent)",
            extra={"fields": {"kind": kind, "to": to, "subject": email["subject"], "mode": mode}},
        )
        return {"ok": True, "mode": mode, "subject": email["subject"]}

    key = os.getenv("RESEND_API_KEY")
    if not key:
        logger.warning(
            "EMAIL_MODE=live but RESEND_API_KEY missing", extra={"fields": {"kind": kind}}
        )
        return {"ok": False, "mode": mode, "error": "no_api_key"}

    body = json.dumps(
        {
            "from": _FROM,
            "to": [to],
            "reply_to": _REPLY_TO,
            "subject": email["subject"],
            "html": email["html"],
            "text": email["text"],
        }
    ).encode()
    req = urllib.request.Request(
        _RESEND_URL,
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT_S) as resp:
            result = json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:300]
        logger.warning(
            "email send failed (http)",
            extra={"fields": {"kind": kind, "to": to, "status": exc.code, "detail": detail}},
        )
        return {"ok": False, "mode": mode, "error": "send_failed", "status": exc.code}
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        logger.warning(
            "email send failed", extra={"fields": {"kind": kind, "to": to, "error": str(exc)}}
        )
        return {"ok": False, "mode": mode, "error": "send_failed"}

    email_id = result.get("id")
    logger.info(
        "email sent", extra={"fields": {"kind": kind, "to": to, "id": email_id, "mode": mode}}
    )
    return {"ok": True, "mode": mode, "id": email_id}


class EmailSendRequest(BaseModel):
    kind: str
    to: str = Field(min_length=3, max_length=320)
    data: dict[str, Any] = Field(default_factory=dict)
    # Deprecated and IGNORED. The tier is derived server-side from the verified subject — a
    # client-declared tier is a request to be trusted, not evidence. Still accepted (unvalidated)
    # for one release so the already-deployed web bundle does not 422 on it.
    consent_tier: str | None = None


# What a BARE internal key may send — the unattended lifecycle mail a backend job legitimately
# triggers for a learner who has no session open. Everything else (a report about a child, a
# premium surprise, a digest of somebody's week) must be attributed: it needs a verified subject
# on the request, and then it may only go to that subject's own address.
LIFECYCLE_KINDS = frozenset({"account_created", "verify_email", "reengage", "course_ready"})


def register_email(app: FastAPI) -> None:
    @app.post("/v1/email/send")
    def send(body: EmailSendRequest, request: Request) -> dict[str, Any]:
        # Fail closed: the internal shared key must be configured AND match, in constant time.
        # An unset INTERNAL_EMAIL_KEY refuses everything — a misconfigured deploy is a dead
        # endpoint, never an open relay.
        expected = os.getenv("INTERNAL_EMAIL_KEY")
        provided = request.headers.get("X-Classess-Internal")
        # Compare as BYTES. secrets.compare_digest raises TypeError on a str that is not pure
        # ASCII, so a header with one accented character used to turn a refusal into a 500 —
        # an unauthenticated caller choosing the error class is a probe, not a mistake. Encoding
        # with errors="ignore" keeps the comparison constant-time and the answer a plain 403.
        if (
            not expected
            or not provided
            or not secrets.compare_digest(provided.encode("utf-8", "ignore"), expected.encode())
        ):
            raise HTTPException(
                status_code=403,
                detail={"code": "not_allowed", "message": "this is not something you can do here"},
            )
        if body.kind not in KINDS:
            raise HTTPException(
                status_code=404,
                detail={"code": "unknown_kind", "message": "I do not have an email of that kind"},
            )
        # The verified subject, when the auth middleware established one. The route used to sit in
        # the middleware's open list, so this was ALWAYS None — and ``may_send_to(None, …)`` is
        # unconditionally True, which made the "a learner may only mail their own address" rule
        # unreachable code. The middleware now authenticates this path when a learner token rides
        # along (without refusing when one does not), so the rule has something to check.
        subject = getattr(request.state, "subject", None)
        if subject is None and body.kind not in LIFECYCLE_KINDS:
            # A bare internal key is a service, not a person. It may send the unattended lifecycle
            # mail and nothing else; anything about a particular learner must carry that learner.
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "not_allowed",
                    "message": "I can only send that one on a learner's own behalf",
                },
            )
        result = send_email(body.kind, body.to, body.data, subject=subject)
        if result.get("error") == "not_allowed":
            raise HTTPException(
                status_code=403,
                detail={"code": "not_allowed", "message": "that is not your address to write to"},
            )
        return result
