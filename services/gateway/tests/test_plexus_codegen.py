"""CI drift gate for the card-spec contract (SUBJECTS.md §7).

The Pydantic models in ``plexus/specs.py`` are the source of truth. If they change without the
committed ``packages/contracts/schemas/plexus.schema.json`` being regenerated, this fails — the
contract can never silently drift from the models. Regenerate with
``uv run python -m wobo_gateway.plexus.codegen``.
"""

from __future__ import annotations

from pathlib import Path

from wobo_gateway.plexus import codegen
from wobo_gateway.plexus.specs import EXPORTED

_SCHEMA = (
    Path(__file__).resolve().parents[3]
    / "packages"
    / "contracts"
    / "schemas"
    / "plexus.schema.json"
)


def test_schema_is_committed_and_current() -> None:
    """The committed schema is byte-identical to a fresh regeneration from specs.py."""
    assert _SCHEMA.exists(), "run `uv run python -m wobo_gateway.plexus.codegen`"
    assert _SCHEMA.read_text(encoding="utf-8") == codegen.render(), (
        "plexus.schema.json is stale — regenerate with "
        "`uv run python -m wobo_gateway.plexus.codegen`"
    )


def test_every_exported_model_is_in_the_schema() -> None:
    """No exported card-spec model is silently dropped from the emitted contract."""
    defs = codegen.build_schema()["$defs"]
    for model in EXPORTED:
        assert model.__name__ in defs, f"{model.__name__} missing from the schema"


def test_check_mode_passes_against_the_committed_schema() -> None:
    """`python -m ...codegen --check` returns 0 when the committed schema is current."""
    import sys

    argv = sys.argv
    sys.argv = ["codegen", "--check"]
    try:
        assert codegen.main() == 0
    finally:
        sys.argv = argv


def test_the_card_contract_carries_every_activity_the_engine_accepts() -> None:
    """Sweep regression: seven subject-scene activities (mathScene, physicsScene, chemScene,
    bioScene, socialScene, mapScene, anatomyScene) were accepted and preserved by
    ``engines._CARD_ACTIVITIES`` but absent from ``Card``, so the generated contract described a
    card that could not carry any of them and every scene travelled outside the schema."""
    from wobo_gateway.plexus.engines import _CARD_ACTIVITIES
    from wobo_gateway.plexus.specs import Card

    missing = set(_CARD_ACTIVITIES) - set(Card.model_fields)
    assert not missing, f"Card is missing activity fields the engine accepts: {sorted(missing)}"

    card_props = codegen.build_schema()["$defs"]["Card"]["properties"]
    for name in _CARD_ACTIVITIES:
        assert name in card_props, f"{name} missing from the emitted Card schema"


def test_the_spec_base_does_not_claim_a_strictness_it_lacks() -> None:
    """Its docstring used to promise it forbade unmodelled fields; no ``extra`` was ever set."""
    from wobo_gateway.plexus.specs import Spec

    assert Spec.model_config.get("extra") in (None, "ignore")
    assert "forbid" not in (Spec.__doc__ or "").lower() or "never did" in (Spec.__doc__ or "")
