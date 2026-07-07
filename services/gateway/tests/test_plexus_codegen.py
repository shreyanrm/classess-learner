"""CI drift gate for the card-spec contract (SUBJECTS.md §7).

The Pydantic models in ``plexus/specs.py`` are the source of truth. If they change without the
committed ``packages/contracts/schemas/plexus.schema.json`` being regenerated, this fails — the
contract can never silently drift from the models. Regenerate with
``uv run python -m classess_gateway.plexus.codegen``.
"""

from __future__ import annotations

from pathlib import Path

from classess_gateway.plexus import codegen
from classess_gateway.plexus.specs import EXPORTED

_SCHEMA = (
    Path(__file__).resolve().parents[3]
    / "packages"
    / "contracts"
    / "schemas"
    / "plexus.schema.json"
)


def test_schema_is_committed_and_current() -> None:
    """The committed schema is byte-identical to a fresh regeneration from specs.py."""
    assert _SCHEMA.exists(), "run `uv run python -m classess_gateway.plexus.codegen`"
    assert _SCHEMA.read_text(encoding="utf-8") == codegen.render(), (
        "plexus.schema.json is stale — regenerate with "
        "`uv run python -m classess_gateway.plexus.codegen`"
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
