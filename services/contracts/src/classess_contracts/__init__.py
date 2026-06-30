"""Python mirror of the Classess event contract.

The TypeScript package ``@classess/contracts`` is the source of truth. Its codegen emits a
JSON Schema bundle (``_bundle.json``) that this package validates against, so the Python
services share the exact same contract with zero hand-maintained drift. Regenerate with
``bun run codegen`` in ``packages/contracts``.
"""

from __future__ import annotations

import json
from importlib.resources import files
from typing import Any

from jsonschema import Draft202012Validator

_BUNDLE: dict[str, Any] = json.loads(
    (files(__package__) / "_bundle.json").read_text(encoding="utf-8")
)

VERSION: str = _BUNDLE.get("version", "v1")
EVENT_TYPES: list[str] = list(_BUNDLE["event_types"])
ENVELOPE_SCHEMA: dict[str, Any] = _BUNDLE["envelope"]
_EVENT_SCHEMAS: dict[str, Any] = _BUNDLE["events"]
_PAYLOAD_SCHEMAS: dict[str, Any] = _BUNDLE["payloads"]

_VALIDATORS: dict[str, Draft202012Validator] = {
    event_type: Draft202012Validator(schema) for event_type, schema in _EVENT_SCHEMAS.items()
}


class ContractViolation(ValueError):
    """Raised when an event does not satisfy its contract schema."""


def is_event_type(value: str) -> bool:
    return value in _EVENT_SCHEMAS


def event_schema(event_type: str) -> dict[str, Any]:
    if event_type not in _EVENT_SCHEMAS:
        raise KeyError(f"unknown event_type: {event_type}")
    return _EVENT_SCHEMAS[event_type]


def payload_schema(event_type: str) -> dict[str, Any]:
    if event_type not in _PAYLOAD_SCHEMAS:
        raise KeyError(f"unknown event_type: {event_type}")
    return _PAYLOAD_SCHEMAS[event_type]


def validate_event(event: dict[str, Any]) -> dict[str, Any]:
    """Validate a full event (envelope + payload). Returns it unchanged, or raises."""
    event_type = event.get("event_type")
    if not isinstance(event_type, str):
        raise ContractViolation("event_type must be a string")
    validator = _VALIDATORS.get(event_type)
    if validator is None:
        raise ContractViolation(f"unknown event_type: {event_type}")
    errors = sorted(validator.iter_errors(event), key=lambda e: list(e.path))
    if errors:
        joined = "; ".join(f"{list(e.path)}: {e.message}" for e in errors[:5])
        raise ContractViolation(f"invalid {event_type}: {joined}")
    return event


__all__ = [
    "VERSION",
    "EVENT_TYPES",
    "ENVELOPE_SCHEMA",
    "ContractViolation",
    "is_event_type",
    "event_schema",
    "payload_schema",
    "validate_event",
]
