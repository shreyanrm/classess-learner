"""Vidya's live turn — perceive, reason grounded, respond, act.

This is Vidya's five capabilities on the atom, wired together for one turn:
- Perceive: she reads the learner's working from the assembled context (canvas + registered targets),
  never a screen-share.
- Reason grounded in correctness: the SymPy verifier decides where the working actually breaks; Vidya
  is told that and must not contradict it (she never free-styles the maths).
- Respond: a graduated hint that never states the answer.
- Act: she returns actions that draw on the page — pointing at the learner's actual step in her palette.

She routes to Track-1 Claude Haiku for speed today (escalating to Sonnet on a hard moment); the Track-2
tutor SLM replaces the primary through the registry once it is trained, with no change here.
"""

from __future__ import annotations

import json
from typing import Any

from classess_verifier.cas import CasError, solution_satisfies, step_preserves_solutions

VIDYA_PRIMARY = "anthropic/claude-haiku-4-5"
VIDYA_ESCALATE = "anthropic/claude-sonnet-4-6"

VIDYA_SYSTEM = """You are Vidya, a warm, precise on-screen tutor. You are directly plugged into the
learner's app: you can SEE their working through the app's own state (a canvas plus a registry of
elements you may draw on), and you can act on the page. You never see a screen-share.

A deterministic verifier has already decided whether the working is correct and, if not, WHICH form
first breaks. Trust it completely; never contradict it and never restate the final answer.

Respond with a graduated hint: a nudge, then a leading question, then a worked-adjacent example, only
escalating as needed. Never give the final value of x. Ask, do not tell.

You may return actions that draw on the page. Only reference targetId values from the provided target
registry. Actions:
- {"type":"say","text":"..."}  a short spoken nudge (never the answer)
- {"type":"highlight","targetId":"<id>","level":"primary|secondary|tertiary"}
- {"type":"annotate","targetId":"<id>","mark":"underline|circle|arrow|bracket|check|crossOut|lookHere","level":"..."}
- {"type":"point","targetId":"<id>"}
- {"type":"setMood","mood":"thinking|hint|correct|celebrate|waiting|idle"}

Reply with strict JSON only, no prose outside it:
{"say":"<one short sentence>","actions":[ ... ]}"""


def _ground_working(equation: str | None, steps: list[str]) -> dict[str, Any] | None:
    """Deterministic grounding: is the final answer right, and which written form first breaks?"""
    if not equation or not steps:
        return None
    working = [equation, *steps]
    final = working[-1]
    try:
        final_correct: bool | None = solution_satisfies(equation, final).passed
    except CasError:
        final_correct = None
    first_bad_form: str | None = None
    for i in range(len(working) - 1):
        try:
            ok: bool | None = step_preserves_solutions(working[i], working[i + 1]).passed
        except CasError:
            ok = None
        if ok is False:
            first_bad_form = working[i + 1]
            break
    return {"final_correct": final_correct, "first_bad_form": first_bad_form}


def _build_user_prompt(context: dict[str, Any], grounding: dict[str, Any] | None) -> str:
    canvas = context.get("canvas") or {}
    curriculum = context.get("curriculum") or {}
    turn = context.get("turn") or {}
    targets = context.get("targets") or []

    node = curriculum.get("nodeName") or "linear equations in one variable"
    equation = canvas.get("equation") or "(none yet)"
    steps = canvas.get("steps") or []
    last_user = turn.get("lastUserInput") or ""
    recent = turn.get("recentTurns") or []

    target_lines = "\n".join(
        f'  - id="{t.get("id")}" ({t.get("kind")}): {t.get("label")}' for t in targets
    ) or "  (none registered)"
    step_lines = "\n".join(f"  {i}: {s}" for i, s in enumerate(steps)) or "  (nothing written yet)"
    recent_lines = "\n".join(f"  {r.get('role')}: {r.get('text')}" for r in recent[-4:]) or "  (none)"

    ground = "no working to check yet"
    if grounding:
        ground = (
            f"final_correct={grounding['final_correct']}, "
            f"first_form_that_breaks={grounding['first_bad_form']!r}"
        )

    return (
        f"Topic: {node}\n"
        f"Problem: {equation}\n"
        f"Learner's working:\n{step_lines}\n\n"
        f"Verifier grounding: {ground}\n\n"
        f"Targets you may draw on:\n{target_lines}\n\n"
        f"Recent conversation:\n{recent_lines}\n"
        f'Learner just said: "{last_user}"\n\n'
        "Give one graduated hint and the actions to point at the exact place that needs attention."
    )


def _extract_json(text: str) -> dict[str, Any]:
    t = text.strip()
    if t.startswith("```"):
        parts = t.split("```")
        t = parts[1] if len(parts) > 1 else t
        if t.lstrip().startswith("json"):
            t = t.lstrip()[4:]
    start, end = t.find("{"), t.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(t[start : end + 1])
        except json.JSONDecodeError:
            return {}
    return {}


def run_vidya_turn(
    *,
    provider_model: str,
    payload: dict[str, Any],
    fallbacks: tuple[str, ...] = (),
) -> tuple[dict[str, Any], int]:
    """One grounded, action-returning Vidya turn. Returns (output, tokens)."""
    import litellm

    context = payload.get("context") or {}
    canvas = context.get("canvas") or {}
    grounding = _ground_working(canvas.get("equation"), canvas.get("steps") or [])

    # Track-2 SLM placeholders are not trained yet: run on real Track-1 Claude for now.
    model = VIDYA_PRIMARY if provider_model.startswith("classess/") else provider_model
    fb = [VIDYA_ESCALATE] if model == VIDYA_PRIMARY else list(fallbacks)

    response = litellm.completion(
        model=model,
        messages=[
            {"role": "system", "content": VIDYA_SYSTEM},
            {"role": "user", "content": _build_user_prompt(context, grounding)},
        ],
        fallbacks=fb or None,
        max_tokens=400,
        temperature=0.3,
    )
    text = response.choices[0].message.content or ""
    data = _extract_json(text)
    say = str(data.get("say", "Let us look at your working together."))
    actions = data.get("actions", [])
    if not isinstance(actions, list):
        actions = []
    usage = getattr(response, "usage", None)
    tokens = int(getattr(usage, "total_tokens", 0) or 0)

    return (
        {"say": say, "actions": actions, "grounded": grounding is not None, "handed_answer": False},
        tokens,
    )
