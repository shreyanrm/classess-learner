"""Transactional email — Resend REST over stdlib urllib, console by default.

``send_email(kind, to, data)`` renders a template (see ``email_templates``) and, per
``EMAIL_MODE``, either logs the render (``console``, the default, so dev and CI never touch
the network) or sends it through Resend (``live``). It never raises into a caller's flow: a
lifecycle trigger that fails to email must not break the learner's action, so every failure
returns a structured result and a warning log instead.

``register_email(app)`` mounts one internal endpoint — ``POST /v1/email/send`` — gated by an
internal shared-key header *and* an elevated consent tier, so it is never an open relay.
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
from classess_gateway.registry import ConsentTier

logger = logging.getLogger("classess.gateway.email")

_FROM = "Vidya at Classess <vidya@mail.classess.com>"
_REPLY_TO = "hello@mail.classess.com"
_RESEND_URL = "https://api.resend.com/emails"
_HTTP_TIMEOUT_S = 20.0


def send_email(kind: str, to: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
    """Render ``kind`` and send or log it. Returns a structured result; never raises."""
    mode = os.getenv("EMAIL_MODE", "console").lower()
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
    consent_tier: ConsentTier
    data: dict[str, Any] = Field(default_factory=dict)


def register_email(app: FastAPI) -> None:
    @app.post("/v1/email/send")
    def send(body: EmailSendRequest, request: Request) -> dict[str, Any]:
        # Fail closed: the internal shared key must be configured AND match, in constant time,
        # so this endpoint is never an open relay even if the consent field is spoofed.
        expected = os.getenv("INTERNAL_EMAIL_KEY")
        provided = request.headers.get("X-Classess-Internal")
        if not expected or not provided or not secrets.compare_digest(provided, expected):
            raise HTTPException(status_code=403, detail="internal key required")
        if body.consent_tier is not ConsentTier.ELEVATED:
            raise HTTPException(status_code=403, detail="elevated consent required")
        if body.kind not in KINDS:
            raise HTTPException(status_code=404, detail=f"unknown email kind: {body.kind}")
        return send_email(body.kind, body.to, body.data)
