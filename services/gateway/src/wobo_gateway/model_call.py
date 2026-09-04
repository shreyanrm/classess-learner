"""One place that talks to a model, so a provider's fussiness never becomes an outage.

Every capability sends a temperature, because a tutor's answers should not wander. Some newer
models refuse any temperature but their own default and answer 400 rather than ignoring the
field, and a 400 on the PRIMARY sends the call down the fallback chain — where the next model
refuses the same field, and the learner gets nothing. Proved in production on 2026-09-04: the
public Ask Wobo failed with "Unsupported value: 'temperature' does not support 0.2 with this
model" on the fallback, on top of an unrelated billing failure at the primary.

``complete`` sends the call as the caller wrote it and, only when the provider objects to a
sampling knob, sends it once more without that knob. Nothing else is retried here: a real
error (no credit, a bad key, a timeout) is raised as it arrived, because hiding those would
cost more than it saves.
"""

from __future__ import annotations

from typing import Any

# The knobs a provider may refuse outright. Dropped one at a time, cheapest first, and only
# when the provider's own message names them.
_SAMPLING_KNOBS = ("temperature", "top_p")


def _objects_to(exc: Exception, knob: str) -> bool:
    """Did the provider refuse this specific knob? A 400 that names it, not any 400."""
    text = str(exc).lower()
    if knob not in text:
        return False
    return any(
        phrase in text
        for phrase in ("unsupported", "does not support", "not supported", "unrecognized")
    )


def complete(**kwargs: Any) -> Any:
    """``litellm.completion`` with one retry that drops a sampling knob the provider refused."""
    import litellm

    litellm.drop_params = True
    try:
        return litellm.completion(**kwargs)
    except Exception as first:  # noqa: BLE001 — re-raised unless it is the fussy-knob case
        refused = [k for k in _SAMPLING_KNOBS if k in kwargs and _objects_to(first, k)]
        if not refused:
            raise
        retry = {k: v for k, v in kwargs.items() if k not in refused}
        return litellm.completion(**retry)
