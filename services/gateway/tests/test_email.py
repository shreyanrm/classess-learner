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


def test_endpoint_403s_when_the_internal_key_is_unset(monkeypatch: pytest.MonkeyPatch) -> None:
    """Fail closed: an unconfigured key refuses every call, even one carrying a header."""
    from fastapi.testclient import TestClient

    monkeypatch.delenv("INTERNAL_EMAIL_KEY", raising=False)
    client = TestClient(create_app())
    body = {"kind": "account_created", "to": "a@b.com", "data": {}}
    assert client.post("/v1/email/send", json=body, headers=INTERNAL_HEADER).status_code == 403
    assert client.post("/v1/email/send", json=body, headers={}).status_code == 403


def test_endpoint_ignores_a_client_declared_consent_tier(monkeypatch: pytest.MonkeyPatch) -> None:
    """The tier is never read from the body. A spoofed low tier neither blocks nor grants —
    the internal key is the authority for an internal lifecycle send."""
    from fastapi.testclient import TestClient

    monkeypatch.setenv("INTERNAL_EMAIL_KEY", "test-internal-key")
    monkeypatch.setenv("EMAIL_MODE", "console")
    client = TestClient(create_app())
    body = {"kind": "account_created", "to": "a@b.com", "consent_tier": "un_elevated", "data": {}}
    r = client.post("/v1/email/send", json=body, headers=INTERNAL_HEADER)
    assert r.status_code == 200


# --- a send made on behalf of a learner may only reach that learner ---------------------
def test_send_on_behalf_of_a_subject_refuses_a_foreign_address() -> None:
    """No profile lookup is wired yet, so a subject-scoped send FAILS CLOSED."""
    result = send_email("account_created", "someone-else@example.com", subject="sub-123")
    assert result["ok"] is False and result["error"] == "not_allowed"


def test_send_on_behalf_of_a_subject_allows_their_own_address(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("EMAIL_MODE", "console")
    monkeypatch.setattr(email_mod, "account_email", lambda sub: "learner@example.com")
    result = send_email("account_created", "Learner@Example.com ", subject="sub-123")
    assert result["ok"] is True


def test_internal_send_without_a_subject_is_allowed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMAIL_MODE", "console")
    assert send_email("account_created", "anyone@example.com")["ok"] is True


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


# --- the recipient-ownership rule is reachable code now ---------------------------------
def test_the_endpoint_refuses_a_foreign_address_for_a_verified_learner(
    monkeypatch: pytest.MonkeyPatch, auth
) -> None:
    """The route sat in the middleware's open list, so ``request.state.subject`` was always None
    and ``may_send_to(None, …)`` returned True unconditionally: the "a learner may only mail
    their own address" rule could never fire on the HTTP route. It fires now."""
    from fastapi.testclient import TestClient

    monkeypatch.setenv("INTERNAL_EMAIL_KEY", "test-internal-key")
    monkeypatch.setenv("EMAIL_MODE", "console")
    monkeypatch.setattr(email_mod, "account_email", lambda sub: "learner@example.com")
    client = TestClient(create_app())
    body = {"kind": "account_created", "to": "attacker@evil.example", "data": {}}
    r = client.post(
        "/v1/email/send", json=body, headers={**INTERNAL_HEADER, **auth("sub-123")}
    )
    assert r.status_code == 403
    assert r.json()["detail"]["code"] == "not_allowed"

    body["to"] = "learner@example.com"
    ok = client.post(
        "/v1/email/send", json=body, headers={**INTERNAL_HEADER, **auth("sub-123")}
    )
    assert ok.status_code == 200


def test_a_bare_internal_key_may_only_send_lifecycle_mail(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Anyone holding the internal key could send ANY template to ANY address with attacker-chosen
    data from our verified sending domain. A key with no learner behind it is a service: it sends
    the unattended lifecycle set and nothing about a particular child."""
    from fastapi.testclient import TestClient

    monkeypatch.setenv("INTERNAL_EMAIL_KEY", "test-internal-key")
    monkeypatch.setenv("EMAIL_MODE", "console")
    client = TestClient(create_app())
    parent = {"kind": "parent_report", "to": "attacker@evil.example", "data": {}}
    r = client.post("/v1/email/send", json=parent, headers=INTERNAL_HEADER)
    assert r.status_code == 403
    lifecycle = {"kind": "account_created", "to": "new@example.com", "data": {}}
    assert client.post("/v1/email/send", json=lifecycle, headers=INTERNAL_HEADER).status_code == 200


def test_a_bad_token_never_turns_the_endpoint_into_a_401(monkeypatch: pytest.MonkeyPatch) -> None:
    """Soft auth: an unreadable Authorization header leaves the internal key as the only door,
    exactly as before — the endpoint must not start 401ing its own callers."""
    from fastapi.testclient import TestClient

    monkeypatch.setenv("INTERNAL_EMAIL_KEY", "test-internal-key")
    monkeypatch.setenv("EMAIL_MODE", "console")
    client = TestClient(create_app())
    body = {"kind": "account_created", "to": "a@b.com", "data": {}}
    r = client.post(
        "/v1/email/send",
        json=body,
        headers={**INTERNAL_HEADER, "Authorization": "Bearer not-a-real-token"},
    )
    assert r.status_code == 200
