"""FastAPI surface for the verifier. Nothing reaches a learner unverified.

- ``POST /v1/verify/math`` — verify a claimed answer and/or solving steps for a linear
  equation in one variable, via the SymPy CAS checks.
- ``POST /v1/verify`` — generic path for numeric-bounds content and the second-model
  cross-check seam.
- ``GET  /healthz`` — liveness.

Every served response carries a ``verification_hash``; a refusal carries the
``cached_verified`` fallback instead.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, model_validator

from . import cas
from .crosscheck import MockCrossChecker
from .gate import DEFAULT_THRESHOLD, CheckResult, Verdict, decide
from .numeric import numeric_within_bounds


class CheckOut(BaseModel):
    name: str
    passed: bool
    detail: str = ""


class VerifyResponse(BaseModel):
    verified: bool
    action: str
    confidence: float
    method: str
    verification_hash: str | None = None
    fallback: str | None = None
    checks: list[CheckOut] = Field(default_factory=list)

    @classmethod
    def from_verdict(cls, v: Verdict) -> VerifyResponse:
        return cls(
            verified=v.verified,
            action=v.action,
            confidence=v.confidence,
            method=v.method,
            verification_hash=v.verification_hash,
            fallback=v.fallback,
            checks=[CheckOut(name=c.name, passed=c.passed, detail=c.detail) for c in v.checks],
        )


class MathVerifyRequest(BaseModel):
    equation: str = Field(min_length=1, description="e.g. 2x+3=7")
    claimed_answer: str | None = Field(default=None, description="e.g. x=2 or 2")
    steps: list[str] | None = Field(
        default=None, description="ordered equation forms; each must preserve the solution set"
    )
    variable: str | None = Field(default=None, description="override the variable, e.g. y")
    threshold: float = Field(default=DEFAULT_THRESHOLD, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def _need_something_to_verify(self) -> MathVerifyRequest:
        if not self.claimed_answer and not self.steps:
            raise ValueError("provide claimed_answer or steps to verify")
        return self


class NumericBounds(BaseModel):
    value: float
    low: float | None = None
    high: float | None = None
    inclusive: bool = True


class GenericVerifyRequest(BaseModel):
    content: dict[str, Any] | str
    method: str = "generic"
    numeric: NumericBounds | None = None
    crosscheck: bool = Field(default=False, description="request the (mock) second-model review")
    threshold: float = Field(default=DEFAULT_THRESHOLD, ge=0.0, le=1.0)


app = FastAPI(title="Classess correctness verifier", version="v1")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/verify/math", response_model=VerifyResponse)
def verify_math(req: MathVerifyRequest) -> VerifyResponse:
    checks: list[CheckResult] = []
    try:
        if req.claimed_answer:
            checks.append(
                cas.solution_satisfies(req.equation, req.claimed_answer, var=req.variable)
            )
        if req.steps:
            checks.append(cas.verify_step_chain(req.equation, req.steps, var=req.variable))
    except cas.CasError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    verdict = decide(
        content={
            "equation": req.equation,
            "claimed_answer": req.claimed_answer,
            "steps": req.steps,
        },
        method="cas.sympy.linear_eq_1v",
        checks=checks,
        threshold=req.threshold,
    )
    return VerifyResponse.from_verdict(verdict)


@app.post("/v1/verify", response_model=VerifyResponse)
def verify_generic(req: GenericVerifyRequest) -> VerifyResponse:
    checks: list[CheckResult] = []
    if req.numeric is not None:
        try:
            checks.append(
                numeric_within_bounds(
                    req.numeric.value,
                    low=req.numeric.low,
                    high=req.numeric.high,
                    inclusive=req.numeric.inclusive,
                )
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    cross = MockCrossChecker().review(str(req.content)) if req.crosscheck else None
    verdict = decide(
        content=req.content,
        method=req.method,
        checks=checks,
        cross=cross,
        threshold=req.threshold,
    )
    return VerifyResponse.from_verdict(verdict)
