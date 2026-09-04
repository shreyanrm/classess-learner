"""The one place that talks to a model, and the fussiness it forgives.

A provider that refuses a sampling knob answers 400. On the PRIMARY that 400 sends the call
down the fallback chain, where the next model refuses the same field, and the learner is told
nothing at all. Proved in production on 2026-09-04. These tests hold the forgiveness narrow:
the refused knob is dropped and the call retried once; every other error is raised as it came.
"""

from __future__ import annotations

import sys
import types
from typing import Any

import pytest
from wobo_gateway import model_call


class _Fake:
    """A stand-in for the litellm module: records calls, answers from a script."""

    def __init__(self, script: list[Any]) -> None:
        self.script = script
        self.calls: list[dict[str, Any]] = []
        self.drop_params = False

    def completion(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        step = self.script.pop(0)
        if isinstance(step, Exception):
            raise step
        return step


@pytest.fixture
def fake(monkeypatch: pytest.MonkeyPatch):
    def _install(script: list[Any]) -> _Fake:
        f = _Fake(script)
        module = types.ModuleType("litellm")
        module.completion = f.completion  # type: ignore[attr-defined]
        module.drop_params = False  # type: ignore[attr-defined]
        monkeypatch.setitem(sys.modules, "litellm", module)
        return f

    return _install


def test_a_call_the_provider_accepts_goes_once(fake) -> None:
    f = fake(["answered"])
    assert model_call.complete(model="m", temperature=0.2) == "answered"
    assert len(f.calls) == 1
    assert f.calls[0]["temperature"] == 0.2


def test_a_refused_temperature_is_dropped_and_the_call_retried(fake) -> None:
    """The exact production message, and the exact recovery a learner needed."""
    refusal = Exception(
        "litellm.BadRequestError: OpenAIException - Unsupported value: 'temperature' does not "
        "support 0.2 with this model. Only the default (1) value is supported."
    )
    f = fake([refusal, "answered without it"])
    assert model_call.complete(model="m", temperature=0.2, max_tokens=220) == "answered without it"
    assert len(f.calls) == 2
    assert "temperature" not in f.calls[1]
    assert f.calls[1]["max_tokens"] == 220, "only the refused knob goes; the rest is untouched"


def test_a_refused_top_p_is_dropped_too(fake) -> None:
    f = fake([Exception("400: top_p is not supported with this model"), "ok"])
    assert model_call.complete(model="m", top_p=0.9) == "ok"
    assert "top_p" not in f.calls[1]


def test_an_error_that_is_not_about_a_knob_is_raised_as_it_came(fake) -> None:
    """No credit, a bad key, a timeout: those are the truth, and hiding them costs more."""
    billing = Exception("Your credit balance is too low to access the Anthropic API.")
    f = fake([billing])
    with pytest.raises(Exception, match="credit balance"):
        model_call.complete(model="m", temperature=0.2)
    assert len(f.calls) == 1, "a real failure is never retried here"


def test_a_400_that_merely_mentions_temperature_in_passing_is_not_swallowed(fake) -> None:
    """The word alone is not consent to retry: the provider has to be refusing the field."""
    f = fake([Exception("the prompt discusses temperature in a physics lesson")])
    with pytest.raises(Exception, match="physics lesson"):
        model_call.complete(model="m", temperature=0.2)
    assert len(f.calls) == 1


def test_a_second_refusal_is_not_retried_again(fake) -> None:
    """One retry, never a loop: a provider that refuses twice is telling us something else."""
    refusal = Exception("Unsupported value: 'temperature' does not support 0.2 with this model")
    f = fake([refusal, refusal])
    with pytest.raises(Exception, match="Unsupported value"):
        model_call.complete(model="m", temperature=0.2)
    assert len(f.calls) == 2
