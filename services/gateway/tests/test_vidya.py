"""Offline tests for Vidya's grounded turn (no model call — CI-safe).

The live turn is proven separately against real Claude; here we lock down the deterministic parts:
the verifier grounding that decides where the working breaks, the prompt assembly, and the mock shape.
"""

from __future__ import annotations

from classess_gateway.providers import MockProvider
from classess_gateway.vidya import _build_user_prompt, _ground_working


def test_ground_working_finds_the_first_bad_form() -> None:
    g = _ground_working("2x + 3 = 7", ["2x = 10", "x = 5"])
    assert g is not None
    assert g["final_correct"] is False
    assert g["first_bad_form"] == "2x = 10"


def test_ground_working_passes_correct_working() -> None:
    g = _ground_working("2x + 3 = 7", ["2x = 4", "x = 2"])
    assert g is not None
    assert g["final_correct"] is True
    assert g["first_bad_form"] is None


def test_ground_working_is_none_without_working() -> None:
    assert _ground_working("2x + 3 = 7", []) is None
    assert _ground_working(None, ["x = 2"]) is None


def test_mock_vidya_turn_returns_say_and_actions() -> None:
    out = MockProvider().complete(
        provider_model="classess/vidya-tutor-slm", capability="vidya.turn", payload={}
    ).output
    assert isinstance(out["say"], str) and out["say"]
    assert isinstance(out["actions"], list)
    assert out["handed_answer"] is False


def test_prompt_carries_the_targets_and_the_grounding() -> None:
    ctx = {
        "canvas": {"equation": "2x + 3 = 7", "steps": ["2x = 10"]},
        "targets": [{"id": "step-0", "kind": "step", "label": "2x = 10"}],
        "turn": {"lastUserInput": "I am stuck", "recentTurns": []},
        "curriculum": {"nodeName": "linear equations in one variable"},
    }
    grounding = _ground_working("2x + 3 = 7", ["2x = 10"])
    prompt = _build_user_prompt(ctx, grounding)
    assert "step-0" in prompt
    assert "2x = 10" in prompt
    assert "I am stuck" in prompt


# --- the five-path orchestrator (deterministic keyword classification, keyless) -------------------


def _mock_turn(text: str) -> dict:
    return MockProvider().complete(
        provider_model="classess/vidya-tutor-slm",
        capability="vidya.turn",
        payload={"context": {"turn": {"lastUserInput": text}}},
    ).output


def test_classify_covers_all_five_paths() -> None:
    from classess_gateway.vidya import classify_intent

    assert classify_intent("why is the sky blue")["path"] == "inline"
    assert classify_intent("make me a sim for ohm's law")["path"] == "component"
    assert classify_intent("draw a diagram of the water cycle")["path"] == "visualization"
    assert classify_intent("start the boss battle")["path"] == "action"
    assert classify_intent("take me to my progress")["path"] == "route"


def test_mock_component_turn_carries_a_verified_spec() -> None:
    out = _mock_turn("quiz me on fractions")
    assert out["path"] == "component"
    assert out["component"]["kind"] == "quiz"
    items = out["component"]["spec"]["items"]
    assert len(items) >= 3
    assert all(item["prompt"] and item["answer"] for item in items)
    assert out["handed_answer"] is False


def test_mock_viz_turn_carries_sanitized_svg() -> None:
    out = _mock_turn("draw me a concept map of photosynthesis")
    assert out["path"] == "visualization"
    assert out["viz"]["kind"] == "conceptmap"
    assert "<svg" in out["viz"]["spec"]["svg"]


def test_mock_action_turn_is_explainable() -> None:
    out = _mock_turn("prepare a note for my parent")
    assert out["path"] == "action"
    action = out["action"]
    assert action["capability"] == "prepare_parent_note"
    assert action["why"]
    assert action["confidence"] in ("high", "medium", "low")


def test_mock_route_turn_names_a_real_surface() -> None:
    out = _mock_turn("go to practice")
    assert out["path"] == "route"
    assert out["route"]["to"] == "practice"


def test_mock_inline_turn_stays_prose() -> None:
    out = _mock_turn("I am stuck on this step")
    assert out["path"] == "inline"
    assert "component" not in out and "viz" not in out
