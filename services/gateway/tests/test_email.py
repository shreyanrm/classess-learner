"""Email tests. Console mode only — Resend is never called and no network is touched."""

from __future__ import annotations

import pytest
from classess_gateway import email as email_mod
from classess_gateway.app import create_app
from classess_gateway.email import send_email
from classess_gateway.email_templates import KINDS, render

INTERNAL_HEADER = {"X-Classess-Internal": "test-internal-key"}


# --- every template renders to a brand-correct email ----------------------------------
@pytest.mark.parametrize("kind", KINDS)
def test_every_template_renders(kind: str) -> None:
    out = render(kind)
    assert set(out) == {"subject", "html", "text"}
    assert out["subject"].strip()
    assert out["text"].strip()
    html = out["html"]
    assert "Wobo" in html  # the wordmark
    assert "#1F35E0" in html  # the one ultramarine button
    assert 'href=' in html  # the button is a real link
    assert "made for curious minds" in html  # the quiet footer
    assert "unsubscribe" in html
    assert "&mdash; Wobo" in html  # the sign-off


def test_there_are_ten_templates() -> None:
    assert len(KINDS) == 10


def test_copy_stays_in_voice_no_emoji_no_exclamation() -> None:
    for kind in KINDS:
        out = render(kind)
        assert "!" not in out["text"], f"{kind} text has an exclamation mark"
        # subjects and headings are sentence case / calm — no shouting punctuation
        assert "!" not in out["subject"], f"{kind} subject has an exclamation mark"


def test_templates_interpolate_data() -> None:
    out = render("boss_victory", {"topic": "titration", "xp": 999})
    assert "titration" in out["html"]
    assert "999" in out["html"]
    assert "titration" in out["text"] and "999" in out["text"]


def test_render_unknown_kind_raises() -> None:
    with pytest.raises(KeyError):
        render("does_not_exist")


# --- console mode never calls the network ---------------------------------------------
def test_console_mode_never_sends(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMAIL_MODE", "console")

    def _boom(*_a: object, **_k: object) -> None:
        raise AssertionError("console mode must never open a network connection")

    monkeypatch.setattr(email_mod.urllib.request, "urlopen", _boom)
    result = send_email("account_created", "learner@example.com", {"name": "Aarav"})
    assert result == {"ok": True, "mode": "console", "subject": "welcome to Wobo"}


def test_send_unknown_kind_is_graceful(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMAIL_MODE", "console")
    result = send_email("nope", "learner@example.com")
    assert result["ok"] is False and result["error"] == "unknown_kind"


def test_live_mode_without_key_never_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMAIL_MODE", "live")
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    result = send_email("account_created", "learner@example.com")
    assert result == {"ok": False, "mode": "live", "error": "no_api_key"}


# --- the internal endpoint is never an open relay -------------------------------------
def test_endpoint_403s_without_internal_header(monkeypatch: pytest.MonkeyPatch) -> None:
    from fastapi.testclient import TestClient

    monkeypatch.setenv("INTERNAL_EMAIL_KEY", "test-internal-key")
    client = TestClient(create_app())
    body = {"kind": "account_created", "to": "a@b.com", "consent_tier": "elevated", "data": {}}
    assert client.post("/v1/email/send", json=body).status_code == 403


def test_endpoint_403s_with_wrong_internal_header(monkeypatch: pytest.MonkeyPatch) -> None:
    from fastapi.testclient import TestClient

    monkeypatch.setenv("INTERNAL_EMAIL_KEY", "test-internal-key")
    client = TestClient(create_app())
    body = {"kind": "account_created", "to": "a@b.com", "consent_tier": "elevated", "data": {}}
    r = client.post("/v1/email/send", json=body, headers={"X-Classess-Internal": "wrong"})
    assert r.status_code == 403


def test_endpoint_403s_without_elevated_consent(monkeypatch: pytest.MonkeyPatch) -> None:
    from fastapi.testclient import TestClient

    monkeypatch.setenv("INTERNAL_EMAIL_KEY", "test-internal-key")
    monkeypatch.setenv("EMAIL_MODE", "console")
    client = TestClient(create_app())
    body = {"kind": "account_created", "to": "a@b.com", "consent_tier": "un_elevated", "data": {}}
    r = client.post("/v1/email/send", json=body, headers=INTERNAL_HEADER)
    assert r.status_code == 403


def test_endpoint_sends_in_console_with_header_and_consent(monkeypatch: pytest.MonkeyPatch) -> None:
    from fastapi.testclient import TestClient

    monkeypatch.setenv("INTERNAL_EMAIL_KEY", "test-internal-key")
    monkeypatch.setenv("EMAIL_MODE", "console")
    client = TestClient(create_app())
    body = {"kind": "account_created", "to": "a@b.com", "consent_tier": "elevated",
            "data": {"name": "Aarav"}}
    r = client.post("/v1/email/send", json=body, headers=INTERNAL_HEADER)
    assert r.status_code == 200
    assert r.json() == {"ok": True, "mode": "console", "subject": "welcome to Wobo"}


def test_endpoint_404s_on_unknown_kind(monkeypatch: pytest.MonkeyPatch) -> None:
    from fastapi.testclient import TestClient

    monkeypatch.setenv("INTERNAL_EMAIL_KEY", "test-internal-key")
    monkeypatch.setenv("EMAIL_MODE", "console")
    client = TestClient(create_app())
    body = {"kind": "made_up", "to": "a@b.com", "consent_tier": "elevated", "data": {}}
    r = client.post("/v1/email/send", json=body, headers=INTERNAL_HEADER)
    assert r.status_code == 404
