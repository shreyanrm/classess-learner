"""FastAPI surface and the gateway engine.

The engine ties the pieces together for one invocation: consent gate -> cache lookup ->
model resolution -> provider call -> cache write -> telemetry. The HTTP surface exposes
invoke, a registry dump, and a health check.

Boot posture: :func:`validate_env` fails fast on a misconfigured environment (never serve
a request half-configured), CORS is locked to the prod origin outside dev, capability
routes are rate limited per IP, and logs are structured JSON.
"""

from __future__ import annotations

import json
import logging
import os
import time
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from classess_gateway.cache import CacheBackend, CacheEntry, InMemoryCache, cache_key
from classess_gateway.providers import Provider, build_provider
from classess_gateway.registry import (
    ConsentTier,
    RoutingPolicy,
    capabilities,
    policy,
)
from classess_gateway.routing import resolve, resolve_any
from classess_gateway.telemetry import MetricsSink, TelemetryEvent, emit
from classess_gateway.voice import register_voice

logger = logging.getLogger("classess.gateway")

_PROD_ORIGIN = "https://learner.classess.com"
_DEV_ORIGINS = ("http://localhost:5173", "http://localhost:5174", "http://localhost:4173")


class _JsonFormatter(logging.Formatter):
    """One JSON object per line — machine-parseable on any host's log drain."""

    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "ts": datetime.now(UTC).isoformat(timespec="milliseconds"),
            "level": record.levelname.lower(),
            "logger": record.name,
            "msg": record.getMessage(),
        }
        entry.update(getattr(record, "fields", None) or {})
        if record.exc_info:
            entry["exc"] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)


def configure_logging() -> None:
    root = logging.getLogger()
    if any(isinstance(h.formatter, _JsonFormatter) for h in root.handlers):
        return  # already configured (create_app runs once per test)
    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())
    root.handlers = [handler]
    root.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())


def validate_env() -> None:
    """Fail fast on boot — a misconfigured gateway must never serve a single request."""
    env = os.getenv("ENV", "dev").lower()
    if env not in {"dev", "stg", "prod"}:
        raise RuntimeError(f"ENV must be one of dev|stg|prod, got {env!r}")
    mode = os.getenv("LLM_MODE", "mock").lower()
    if mode not in {"mock", "live"}:
        raise RuntimeError(f"LLM_MODE must be mock|live, got {mode!r}")
    if mode == "live":
        if not os.getenv("ANTHROPIC_API_KEY"):
            raise RuntimeError(
                "LLM_MODE=live requires ANTHROPIC_API_KEY (Track 1 primary). "
                "Set it in the environment or run with LLM_MODE=mock."
            )
        if not os.getenv("OPENAI_API_KEY"):
            logger.warning("OPENAI_API_KEY missing: cross-check fallbacks will fail over")
        if not (os.getenv("GOOGLE_AI_API_KEY") or os.getenv("GEMINI_API_KEY")):
            logger.warning("GOOGLE_AI_API_KEY missing: voice and imagery stay unavailable")


def _cors_origins() -> list[str]:
    # Locked: localhost is a dev convenience and must never reach prod's allowlist.
    if os.getenv("ENV", "dev").lower() == "prod":
        return [_PROD_ORIGIN]
    return [_PROD_ORIGIN, *_DEV_ORIGINS]


class ConsentDenied(Exception):
    """Raised when a capability is invoked under a consent tier it does not permit."""

    def __init__(self, capability: str, consent_tier: ConsentTier) -> None:
        self.capability = capability
        self.consent_tier = consent_tier
        super().__init__(
            f"{capability} requires an elevated consent tier; got {consent_tier.value}"
        )


class CapabilityRequest(BaseModel):
    consent_tier: ConsentTier
    payload: dict[str, Any] = Field(default_factory=dict)


class CapabilityResponse(BaseModel):
    capability: str
    track: str
    model: str
    cache_hit: bool
    latency_ms: float
    tokens: int
    output: dict[str, Any]


class PolicyView(BaseModel):
    capability: str
    track: str
    primary: str
    primary_model: str
    fallback: list[str]
    max_latency_ms: int
    cost_ceiling: float
    cache_tier: str
    elevated_only: bool


def _policy_view(pol: RoutingPolicy) -> PolicyView:
    return PolicyView(
        capability=pol.capability,
        track=pol.track.value,
        primary=pol.primary,
        primary_model=resolve(pol.primary, pol.track).provider_model,
        fallback=list(pol.fallback),
        max_latency_ms=pol.max_latency_ms,
        cost_ceiling=pol.cost_ceiling,
        cache_tier=pol.cache_tier.value,
        elevated_only=pol.elevated_only,
    )


class Gateway:
    def __init__(self, provider: Provider, cache: CacheBackend, sink: MetricsSink) -> None:
        self.provider = provider
        self.cache = cache
        self.sink = sink

    def invoke(self, capability: str, request: CapabilityRequest) -> CapabilityResponse:
        pol = policy(capability)
        if not pol.allows(request.consent_tier):
            raise ConsentDenied(capability, request.consent_tier)

        spec = resolve(pol.primary, pol.track)
        key = cache_key(capability, request.payload)

        cached = self.cache.get(key, pol.cache_tier)
        if cached is not None:
            emit(
                self.sink,
                TelemetryEvent(capability, spec.track.value, cached.model, 0.0, 0, True),
            )
            return CapabilityResponse(
                capability=capability,
                track=spec.track.value,
                model=cached.model,
                cache_hit=True,
                latency_ms=0.0,
                tokens=0,
                output=cached.output,
            )

        fallbacks = tuple(resolve_any(name).provider_model for name in pol.fallback)
        start = time.perf_counter()
        result = self.provider.complete(
            provider_model=spec.provider_model,
            capability=capability,
            payload=request.payload,
            fallbacks=fallbacks,
        )
        latency_ms = (time.perf_counter() - start) * 1000

        self.cache.set(
            key,
            CacheEntry(output=result.output, model=spec.provider_model, tokens=result.tokens),
            pol.cache_tier,
        )
        emit(
            self.sink,
            TelemetryEvent(
                capability, spec.track.value, spec.provider_model, latency_ms, result.tokens, False
            ),
        )
        return CapabilityResponse(
            capability=capability,
            track=spec.track.value,
            model=spec.provider_model,
            cache_hit=False,
            latency_ms=latency_ms,
            tokens=result.tokens,
            output=result.output,
        )


def build_gateway() -> Gateway:
    mode = os.getenv("LLM_MODE", "mock").lower()
    return Gateway(build_provider(mode), InMemoryCache(), MetricsSink())


def create_app(gateway: Gateway | None = None) -> FastAPI:
    configure_logging()
    validate_env()
    app = FastAPI(title="Classess model gateway", version="0.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins(),
        allow_methods=["*"],
        allow_headers=["*"],
    )
    gw = gateway or build_gateway()
    logger.info(
        "gateway booted",
        extra={
            "fields": {
                "env": os.getenv("ENV", "dev").lower(),
                "llm_mode": os.getenv("LLM_MODE", "mock").lower(),
            }
        },
    )

    # Per-IP rate limit on spend-bearing routes (capability invokes + voice-token mints).
    # ponytail: in-memory fixed window, per process — move to Redis when >1 instance runs.
    limit = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    hits: dict[tuple[str, int], int] = {}

    @app.middleware("http")
    async def _guard_and_log(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        started = time.perf_counter()
        path = request.url.path
        ip = request.client.host if request.client else "unknown"
        limited = path.startswith("/v1/capability/") or path == "/v1/voice/session"
        if limited:
            window = int(time.time() // 60)
            if len(hits) > 4096:
                hits.clear()  # ponytail: cheap prune; worst case one window over-admits
            key = (ip, window)
            hits[key] = hits.get(key, 0) + 1
            if hits[key] > limit:
                response: Response = JSONResponse(
                    status_code=429,
                    content={"error": "rate_limited", "detail": "too many requests"},
                    headers={"Retry-After": str(60 - int(time.time()) % 60)},
                )
            else:
                response = await call_next(request)
        else:
            response = await call_next(request)
        if path != "/healthz":  # health probes would drown the log
            logger.info(
                "request",
                extra={
                    "fields": {
                        "method": request.method,
                        "path": path,
                        "status": response.status_code,
                        "ip": ip,
                        "duration_ms": round((time.perf_counter() - started) * 1000, 1),
                    }
                },
            )
        return response

    @app.exception_handler(ConsentDenied)
    async def _on_consent_denied(_: Request, exc: ConsentDenied) -> JSONResponse:
        return JSONResponse(
            status_code=403,
            content={
                "error": "consent_denied",
                "capability": exc.capability,
                "consent_tier": exc.consent_tier.value,
                "detail": "this capability requires an elevated consent tier",
            },
        )

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok", "mode": os.getenv("LLM_MODE", "mock").lower()}

    @app.get("/v1/capabilities")
    def list_capabilities() -> list[PolicyView]:
        return [_policy_view(policy(name)) for name in capabilities()]

    @app.post("/v1/capability/{name}")
    def invoke(name: str, request: CapabilityRequest) -> CapabilityResponse:
        if name not in set(capabilities()):
            raise HTTPException(status_code=404, detail=f"unknown capability: {name}")
        return gw.invoke(name, request)

    register_voice(app)

    return app


app = create_app()
