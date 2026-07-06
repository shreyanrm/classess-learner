"""FastAPI surface and the gateway engine.

The engine ties the pieces together for one invocation: consent gate -> cache lookup ->
model resolution -> provider call -> cache write -> telemetry. The HTTP surface exposes
invoke, a registry dump, and a health check.
"""

from __future__ import annotations

import os
import time
from typing import Any

from fastapi import FastAPI, HTTPException, Request
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
    app = FastAPI(title="Classess model gateway", version="0.0.0")
    # Dev: the web-pwa (Vite/preview) calls the gateway from the browser.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:4173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    gw = gateway or build_gateway()

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

    return app


app = create_app()
