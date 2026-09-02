"""Transactional email templates — every one a pure function returning {subject, html, text}.

A single shared shell (`_shell`) carries the brand law so no template drifts: a 600px
white card, ink text on a hairline grid, the Wobo wordmark as text, exactly one
ultramarine bulletproof button (with a VML fallback so Outlook draws it too), a cursive
"— Wobo" sign-off, and a quiet footer. No remote images anywhere — every visual is built
from nested tables and inline styles, so Gmail, Outlook, and Apple Mail render it clean.

Voice is Wobo's: warm, playful, sentence case, no emoji, no exclamation marks. Templates
take a plain `data` dict and fall back to sensible copy for any missing field, so a render
never raises and the visual proof needs no live data.
"""

from __future__ import annotations

import html
from collections.abc import Callable
from typing import Any

# --- brand tokens (locked spec) -------------------------------------------------------
FONT = "'Poppins', 'Helvetica Neue', Arial, sans-serif"
CURSIVE = "'Caveat', 'Segoe Script', cursive"
PAGE = "#F4F4F7"       # the light gray behind the card
CANVAS = "#FFFFFF"     # the card itself
INK = "#121316"        # primary text
BODY = "#43444B"       # comfortable reading body
SECONDARY = "#5C5E66"  # supporting text
FOOTER = "#9A9BA2"     # quiet footer
HAIRLINE = "#E9E9EE"   # dividers
TRACK = "#F1F1F5"      # empty bar track
ULTRA = "#1F35E0"      # signature pigment: brand + mastery, and the one button
MOLTEN = "#FF5A1F"     # earned accent — a streak flame, an XP number
MAGENTA = "#CC1E7A"    # earned accent — the gift
ACID = "#66B300"       # earned accent — growth

_esc = html.escape


# --- shell fragments ------------------------------------------------------------------
def _hairline() -> str:
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'border="0"><tr><td style="border-top:1px solid {HAIRLINE};font-size:0;'
        'line-height:0;">&nbsp;</td></tr></table>'
    )


def _button(label: str, url: str) -> str:
    """The one ultramarine call to action — bulletproof, with a VML fallback for Outlook."""
    label, url = _esc(label), _esc(url, quote=True)
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'
        f'<td align="center" bgcolor="{ULTRA}" style="border-radius:3px;">'
        f'<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" '
        'xmlns:w="urn:schemas-microsoft-com:office:word" '
        f'href="{url}" style="height:46px;v-text-anchor:middle;width:260px;" arcsize="8%" '
        f'strokecolor="{ULTRA}" fillcolor="{ULTRA}"><w:anchorlock/>'
        f'<center style="color:#ffffff;font-family:{FONT};font-size:15px;font-weight:bold;">'
        f'{label}</center></v:roundrect><![endif]-->'
        '<!--[if !mso]><!-->'
        f'<a href="{url}" style="display:inline-block;padding:14px 32px;font-family:{FONT};'
        'font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:3px;'
        f'background-color:{ULTRA};">{label}</a>'
        '<!--<![endif]--></td></tr></table>'
    )


def _p(text: str, color: str = BODY) -> str:
    return (
        f'<p style="margin:0 0 16px 0;font-family:{FONT};font-size:15px;line-height:1.6;'
        f'color:{color};">{text}</p>'
    )


def _bullets(items: list[str]) -> str:
    rows = "".join(
        '<tr>'
        f'<td valign="top" width="16" style="padding:4px 0;font-family:{FONT};font-size:15px;'
        f'line-height:1.5;color:{ULTRA};">&middot;</td>'
        f'<td style="padding:4px 0;font-family:{FONT};font-size:15px;line-height:1.5;'
        f'color:{BODY};">{_esc(str(it))}</td></tr>'
        for it in items
    )
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="margin:4px 0 20px 0;">{rows}</table>'
    )


def _stats(cells: list[tuple[str, str, str]]) -> str:
    """A row of headline numbers — (value, label, color) each. Table cells, never flex."""
    tds = "".join(
        f'<td width="33%" valign="top" style="padding:0 8px;">'
        f'<div style="font-family:{FONT};font-size:26px;font-weight:700;color:{color};'
        f'line-height:1.1;">{_esc(value)}</div>'
        f'<div style="font-family:{FONT};font-size:12px;color:{SECONDARY};'
        f'padding-top:4px;">{_esc(label)}</div></td>'
        for value, label, color in cells
    )
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="margin:4px 0 22px 0;"><tr>{tds}</tr></table>'
    )


def _bar(label: str, value: str, pct: int, color: str = ULTRA) -> str:
    """One horizontal bar built from two colored table cells — no image, glanceable."""
    pct = max(2, min(100, int(pct)))
    rest = 100 - pct
    fill = (
        f'<td width="{pct}%" style="background-color:{color};height:10px;border-radius:3px;'
        'font-size:0;line-height:0;">&nbsp;</td>'
    )
    gap = (
        f'<td width="{rest}%" style="font-size:0;line-height:0;">&nbsp;</td>' if rest > 0 else ""
    )
    return (
        '<tr>'
        f'<td width="128" valign="middle" style="padding:7px 12px 7px 0;font-family:{FONT};'
        f'font-size:13px;color:{SECONDARY};">{_esc(label)}</td>'
        '<td valign="middle" style="padding:7px 0;">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="background-color:{TRACK};border-radius:3px;"><tr>{fill}{gap}</tr></table></td>'
        f'<td width="48" align="right" valign="middle" style="padding:7px 0 7px 12px;'
        f'font-family:{FONT};font-size:13px;font-weight:600;color:{INK};">{_esc(value)}</td>'
        '</tr>'
    )


def _bars(rows: list[str]) -> str:
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="margin:2px 0 20px 0;">{"".join(rows)}</table>'
    )


def _chips(items: list[str]) -> str:
    """Soft gray pills for focus areas — table cells, wrap via inline-block spans."""
    pills = "".join(
        f'<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;'
        f'font-family:{FONT};font-size:13px;color:{SECONDARY};background-color:{TRACK};'
        f'border-radius:3px;">{_esc(str(it))}</span>'
        for it in items
    )
    return f'<div style="margin:2px 0 20px 0;">{pills}</div>'


def _shell(
    *,
    preheader: str,
    heading: str,
    body: str,
    cta_label: str,
    cta_url: str,
) -> str:
    """Every email is this: wordmark, heading, body blocks, the one button, sign-off, footer."""
    return (
        "<!DOCTYPE html>"
        '<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">'
        '<head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<meta name="x-apple-disable-message-reformatting">'
        "<title>Wobo</title></head>"
        f'<body style="margin:0;padding:0;background-color:{PAGE};">'
        f'<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;color:{PAGE};'
        f'font-size:1px;line-height:1px;">{_esc(preheader)}</div>'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="background-color:{PAGE};"><tr>'
        '<td align="center" style="padding:32px 12px;">'
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" '
        f'style="width:100%;max-width:600px;background-color:{CANVAS};border-radius:3px;">'
        # wordmark
        '<tr><td style="padding:38px 44px 0 44px;">'
        f'<span style="font-family:{FONT};font-size:20px;font-weight:700;letter-spacing:-0.6px;'
        f'color:{INK};">Wobo</span></td></tr>'
        '<tr><td style="padding:22px 44px 0 44px;">' + _hairline() + "</td></tr>"
        # heading + body
        '<tr><td style="padding:30px 44px 0 44px;">'
        f'<h1 style="margin:0 0 18px 0;font-family:{FONT};font-size:24px;font-weight:700;'
        f'line-height:1.28;letter-spacing:-0.3px;color:{INK};">{heading}</h1>'
        f"{body}</td></tr>"
        # the one button
        '<tr><td style="padding:8px 44px 4px 44px;">' + _button(cta_label, cta_url) + "</td></tr>"
        # sign-off
        '<tr><td style="padding:26px 44px 34px 44px;">'
        f'<div style="font-family:{CURSIVE};font-size:27px;color:{INK};line-height:1;">'
        "&mdash; Wobo</div></td></tr>"
        '<tr><td style="padding:0 44px;">' + _hairline() + "</td></tr>"
        # footer
        '<tr><td style="padding:22px 44px 36px 44px;">'
        f'<p style="margin:0 0 6px 0;font-family:{FONT};font-size:12px;color:{FOOTER};">'
        "Wobo &middot; made for curious minds</p>"
        f'<p style="margin:0 0 6px 0;font-family:{FONT};font-size:12px;color:{FOOTER};">'
        "[street address placeholder] &middot; [city, country]</p>"
        f'<p style="margin:0;font-family:{FONT};font-size:12px;color:{FOOTER};">'
        '<a href="{{unsubscribe_url}}" style="color:' + FOOTER + ';text-decoration:underline;">'
        "unsubscribe</a></p>"
        "</td></tr></table></td></tr></table></body></html>"
    )


def _name(data: dict[str, Any], key: str = "name", default: str = "there") -> str:
    return _esc(str(data.get(key) or default))


# --- the ten templates ----------------------------------------------------------------
def account_created(data: dict[str, Any]) -> dict[str, str]:
    name = _name(data)
    body = (
        _p("i'm Wobo, your AI wobot. i'll be the one learning how you think, so every idea "
           "meets you where you are, not where a textbook assumes you are.")
        + _p("there's nothing to set up. pick something you're curious about and we'll start "
             "there. your first course is on me, written for you the moment you open it.")
    )
    html_out = _shell(
        preheader="your account is ready, and so am i.",
        heading=f"welcome, {name}",
        body=body,
        cta_label="start your first course",
        cta_url=data.get("cta_url", "https://learner.classess.com/learn"),
    )
    text = (
        f"welcome, {data.get('name') or 'there'}\n\n"
        "i'm Wobo, your AI wobot. i'll be the one learning how you think, so every idea meets "
        "you where you are.\n\nthere's nothing to set up. pick something you're curious about and "
        "we'll start there. your first course is on me.\n\n"
        f"start your first course: {data.get('cta_url', 'https://learner.classess.com/learn')}\n\n"
        "— Wobo\nWobo · made for curious minds"
    )
    return {"subject": "welcome to Wobo", "html": html_out, "text": text}


def verify_email(data: dict[str, Any]) -> dict[str, str]:
    link = data.get("link", "https://learner.classess.com/verify")
    code = _esc(str(data.get("code", "482913")))
    body = (
        _p("tap the button below to confirm your email and open your account. the link works "
           "once and expires shortly.")
        + '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
          'style="margin:0 0 20px 0;"><tr>'
          f'<td style="padding:12px 20px;background-color:{TRACK};border-radius:3px;'
          f'font-family:{FONT};font-size:22px;font-weight:700;letter-spacing:4px;'
          f'color:{ULTRA};">{code}</td></tr></table>'
        + _p("or enter that code if you'd rather. if you didn't ask for this, you can ignore "
             "it, nothing happens until the link is used.", color=SECONDARY)
    )
    html_out = _shell(
        preheader="confirm your email to finish signing in.",
        heading="let's confirm it's you",
        body=body,
        cta_label="verify email",
        cta_url=link,
    )
    text = (
        "let's confirm it's you\n\n"
        "tap the link below to confirm your email and open your account. it works once and "
        f"expires shortly.\n\nverify: {link}\n\nor enter this code: {data.get('code', '482913')}"
        "\n\nif you didn't ask for this, you can ignore it.\n\n— Wobo"
    )
    return {"subject": "confirm your email", "html": html_out, "text": text}


def course_ready(data: dict[str, Any]) -> dict[str, str]:
    topic = _esc(str(data.get("topic", "your topic")))
    inside = data.get("inside") or [
        "one idea per screen, nothing rushed",
        "things to drag, tap, and try for yourself",
        "a boss battle waiting at the end",
    ]
    body = (
        _p("i built it for you just now, grounded on the real syllabus and shaped to how "
           "you learn. here's what's inside:")
        + _bullets(inside)
        + _p("come in when you have ten quiet minutes. we'll take it one screen at a time.")
    )
    html_out = _shell(
        preheader=f"your course on {data.get('topic', 'your topic')} is ready to open.",
        heading=f"your course on {topic} is ready",
        body=body,
        cta_label="open your course",
        cta_url=data.get("cta_url", "https://learner.classess.com/learn"),
    )
    text = (
        f"your course on {data.get('topic', 'your topic')} is ready\n\n"
        "i built it for you just now. inside:\n"
        + "".join(f"- {i}\n" for i in inside)
        + "\ncome in when you have ten quiet minutes.\n\n"
        f"open your course: {data.get('cta_url', 'https://learner.classess.com/learn')}\n\n— Wobo"
    )
    return {"subject": f"your course on {data.get('topic', 'your topic')} is ready",
            "html": html_out, "text": text}


def boss_victory(data: dict[str, Any]) -> dict[str, str]:
    # heading reads "you beat the {topic} boss" — pass a bare noun phrase, no leading article
    raw_topic = str(data.get("topic", "topic")).removeprefix("the ")
    topic = _esc(raw_topic)
    xp = _esc(str(data.get("xp", 250)))
    body = (
        f'<div style="margin:0 0 18px 0;font-family:{FONT};font-size:34px;font-weight:700;'
        f'color:{MOLTEN};line-height:1;">+{xp} XP</div>'
        + _p("that wasn't a quiz, it was the real thing, and you worked it out yourself. "
             "that's the part that stays with you.")
        + _p("i've marked what you're solid on and what's worth a revisit later, so nothing "
             "you earned quietly slips away.")
    )
    html_out = _shell(
        preheader=f"you beat the {raw_topic} boss.",
        heading=f"you beat the {topic} boss",
        body=body,
        cta_label="see what's next",
        cta_url=data.get("cta_url", "https://learner.classess.com/learn"),
    )
    text = (
        f"you beat the {raw_topic} boss\n\n+{data.get('xp', 250)} XP\n\n"
        "that wasn't a quiz, it was the real thing, and you worked it out yourself.\n\n"
        "i've marked what you're solid on and what's worth a revisit later.\n\n"
        f"see what's next: {data.get('cta_url', 'https://learner.classess.com/learn')}\n\n— Wobo"
    )
    return {"subject": f"you beat the {raw_topic} boss", "html": html_out, "text": text}


def level_up(data: dict[str, Any]) -> dict[str, str]:
    level = _esc(str(data.get("level", 4)))
    unlocked = data.get("unlocked") or [
        "synthesis boss battles across everything you know",
        "a sanctioned rabbit hole from where you stand",
        "the perturbation sandbox, where you break a law to understand it",
    ]
    body = (
        f'<div style="margin:0 0 18px 0;font-family:{FONT};font-size:14px;font-weight:600;'
        f'letter-spacing:1px;text-transform:uppercase;color:{ACID};">level {level}</div>'
        + _p("you've been showing up, and it shows. here's what just opened up for you:")
        + _bullets(unlocked)
        + _p("no rush to use all of it today. it'll be here when you're curious.")
    )
    html_out = _shell(
        preheader=f"you reached level {data.get('level', 4)}.",
        heading=f"level {level}",
        body=body,
        cta_label="keep going",
        cta_url=data.get("cta_url", "https://learner.classess.com/learn"),
    )
    text = (
        f"level {data.get('level', 4)}\n\nyou've been showing up, and it shows. what just "
        "opened up:\n" + "".join(f"- {u}\n" for u in unlocked)
        + "\nno rush to use all of it today.\n\n"
        f"keep going: {data.get('cta_url', 'https://learner.classess.com/learn')}\n\n— Wobo"
    )
    return {"subject": f"you reached level {data.get('level', 4)}", "html": html_out, "text": text}


def streak_milestone(data: dict[str, Any]) -> dict[str, str]:
    days = _esc(str(data.get("days", 24)))
    body = (
        f'<div style="margin:0 0 18px 0;font-family:{FONT};font-size:34px;font-weight:700;'
        f'color:{MOLTEN};line-height:1;">&#9650; {days} days</div>'
        + _p(f"that's {days} days you chose to think a little harder than you had to. that "
             "isn't a number, it's who you're becoming.")
        + _p("if you need a rest day, take it. a planned pause keeps this honest, and i'll "
             "hold your place. the streak is the habit, not the pressure.")
    )
    html_out = _shell(
        preheader=f"{data.get('days', 24)} days of being a learner.",
        heading=f"{days} days of being a learner",
        body=body,
        cta_label="continue your streak",
        cta_url=data.get("cta_url", "https://learner.classess.com/learn"),
    )
    text = (
        f"{data.get('days', 24)} days of being a learner\n\n"
        f"that's {data.get('days', 24)} days you chose to think a little harder than you had "
        "to.\n\nif you need a rest day, take it. i'll hold your place.\n\n"
        f"continue: {data.get('cta_url', 'https://learner.classess.com/learn')}\n\n— Wobo"
    )
    return {"subject": f"{data.get('days', 24)} days of being a learner",
            "html": html_out, "text": text}


def weekly_digest(data: dict[str, Any]) -> dict[str, str]:
    name = _name(data)
    xp = _esc(str(data.get("xp", 640)))
    minutes = _esc(str(data.get("minutes", 82)))
    topics = data.get("topics") or ["acids and bases", "the mole concept", "electric circuits"]
    bars = data.get("bars") or [
        ("acids and bases", "solid", 88),
        ("the mole concept", "growing", 61),
        ("electric circuits", "started", 34),
    ]
    line = _esc(str(data.get("line",
        "the circuits work is the one to keep warm this week, you're closer than it feels.")))
    bar_rows = [_bar(lbl, val, pct, ULTRA) for lbl, val, pct in bars]
    body = (
        _p(f"here's your week in one glance, {name}. you touched {len(topics)} topics and "
           "kept the habit alive.")
        + _stats([(f"+{xp}", "xp earned", MOLTEN),
                  (str(len(topics)), "topics touched", INK),
                  (f"{minutes}m", "time thinking", INK)])
        + _bars(bar_rows)
        + _p(line, color=SECONDARY)
    )
    html_out = _shell(
        preheader="your week of learning, in one glance.",
        heading=f"your week, {name}",
        body=body,
        cta_label="pick up where you left off",
        cta_url=data.get("cta_url", "https://learner.classess.com/learn"),
    )
    text = (
        f"your week, {data.get('name') or 'there'}\n\n"
        f"+{data.get('xp', 640)} xp · {len(topics)} topics · {data.get('minutes', 82)}m\n\n"
        + "".join(f"- {lbl}: {val} ({pct}%)\n" for lbl, val, pct in bars)
        + f"\n{data.get('line', '')}\n\n"
        f"pick up: {data.get('cta_url', 'https://learner.classess.com/learn')}\n\n— Wobo"
    )
    return {"subject": f"your week, {data.get('name') or 'there'}", "html": html_out, "text": text}


def parent_report(data: dict[str, Any]) -> dict[str, str]:
    parent = _name(data, "parent_name", "there")
    learner = _esc(str(data.get("learner_name", "your child")))
    strengths = data.get("strengths") or [
        ("independent problem-solving", "strong", 86),
        ("sticking with hard problems", "strong", 79),
        ("connecting ideas across topics", "growing", 64),
    ]
    focus = data.get("focus") or ["speed under time pressure", "revising older topics"]
    trajectory = _esc(str(data.get("trajectory",
        "on track to master this term's core science ahead of the exam window")))
    strength_rows = [_bar(lbl, val, pct, ACID) for lbl, val, pct in strengths]
    body = (
        _p(f"a quiet look at {learner}'s week, {parent}, drawn from their own work, not a "
           "test. this is who they're becoming.")
        + f'<p style="margin:0 0 8px 0;font-family:{FONT};font-size:13px;font-weight:600;'
          f'letter-spacing:0.5px;text-transform:uppercase;color:{SECONDARY};">strengths</p>'
        + _bars(strength_rows)
        + f'<p style="margin:0 0 8px 0;font-family:{FONT};font-size:13px;font-weight:600;'
          f'letter-spacing:0.5px;text-transform:uppercase;color:{SECONDARY};">worth a nudge</p>'
        + _chips(focus)
        + f'<div style="margin:0 0 20px 0;padding:16px 18px;background-color:{TRACK};'
          f'border-radius:3px;font-family:{FONT};font-size:15px;line-height:1.5;color:{INK};">'
          f'<span style="color:{ULTRA};font-weight:700;">trajectory &nbsp;</span>{trajectory}'
          "</div>"
    )
    html_out = _shell(
        preheader=f"{data.get('learner_name', 'your child')}'s week, in one calm view.",
        heading=f"{learner}'s week",
        body=body,
        cta_label="see the full picture",
        cta_url=data.get("cta_url", "https://learner.classess.com/parent"),
    )
    text = (
        f"{data.get('learner_name', 'your child')}'s week\n\nstrengths:\n"
        + "".join(f"- {lbl}: {val} ({pct}%)\n" for lbl, val, pct in strengths)
        + "\nworth a nudge: " + ", ".join(focus) + "\n\n"
        f"trajectory: {data.get('trajectory', '')}\n\n"
        f"see the full picture: {data.get('cta_url', 'https://learner.classess.com/parent')}\n\n"
        "— Wobo"
    )
    return {"subject": f"{data.get('learner_name', 'your child')}'s week at Wobo",
            "html": html_out, "text": text}


def reengage(data: dict[str, Any]) -> dict[str, str]:
    name = _name(data)
    hook = _esc(str(data.get("hook",
        "you were one screen away from cracking why the missing 2ab rectangles complete the square")))
    body = (
        _p("no guilt here, life gets loud. but you left something half-finished, and it's "
           "the good kind of half-finished.")
        + f'<div style="margin:0 0 20px 0;padding:16px 18px;border-left:3px solid {ULTRA};'
          f'background-color:{TRACK};border-radius:3px;font-family:{FONT};font-size:15px;'
          f'line-height:1.5;color:{INK};">{hook}</div>'
        + _p("give it ten minutes. i'll pick up exactly where we stopped, nothing to retrace.")
    )
    html_out = _shell(
        preheader="you left something half-finished, the good kind.",
        heading=f"it's been a minute, {name}",
        body=body,
        cta_label="come back to it",
        cta_url=data.get("cta_url", "https://learner.classess.com/learn"),
    )
    text = (
        f"it's been a minute, {data.get('name') or 'there'}\n\n"
        "no guilt here. but you left something half-finished, the good kind.\n\n"
        f"{data.get('hook', '')}\n\ngive it ten minutes. i'll pick up where we stopped.\n\n"
        f"come back: {data.get('cta_url', 'https://learner.classess.com/learn')}\n\n— Wobo"
    )
    return {"subject": f"it's been a minute, {data.get('name') or 'there'}",
            "html": html_out, "text": text}


def premium_surprise(data: dict[str, Any]) -> dict[str, str]:
    name = _name(data)
    days = _esc(str(data.get("days", 14)))
    reason = _esc(str(data.get("reason",
        "you've shown up with real curiosity and earned mastery the honest way")))
    body = (
        f'<div style="margin:0 0 18px 0;font-family:{FONT};font-size:34px;font-weight:700;'
        f'color:{MAGENTA};line-height:1;">{days} days of premium</div>'
        + _p(f"this one's a gift, {name}. {reason}, so i've unlocked {days} days of premium "
             "for you, no strings and nothing to enter.")
        + _p("go deeper, follow a rabbit hole, build something out of syllabus. see how far "
             "it goes while it's yours.")
    )
    html_out = _shell(
        preheader=f"a gift: {data.get('days', 14)} days of premium, on us.",
        heading=f"a gift for you, {name}",
        body=body,
        cta_label="enjoy premium",
        cta_url=data.get("cta_url", "https://learner.classess.com/learn"),
    )
    text = (
        f"a gift for you, {data.get('name') or 'there'}\n\n{data.get('days', 14)} days of "
        f"premium\n\n{data.get('reason', '')}, so i've unlocked {data.get('days', 14)} days "
        "of premium for you, no strings.\n\ngo deeper, follow a rabbit hole, build something "
        "out of syllabus.\n\n"
        f"enjoy premium: {data.get('cta_url', 'https://learner.classess.com/learn')}\n\n— Wobo"
    )
    return {"subject": f"a gift: {data.get('days', 14)} days of premium",
            "html": html_out, "text": text}


# --- registry -------------------------------------------------------------------------
TEMPLATES: dict[str, Callable[[dict[str, Any]], dict[str, str]]] = {
    "account_created": account_created,
    "verify_email": verify_email,
    "course_ready": course_ready,
    "boss_victory": boss_victory,
    "level_up": level_up,
    "streak_milestone": streak_milestone,
    "weekly_digest": weekly_digest,
    "parent_report": parent_report,
    "reengage": reengage,
    "premium_surprise": premium_surprise,
}

KINDS = tuple(TEMPLATES)


def render(kind: str, data: dict[str, Any] | None = None) -> dict[str, str]:
    """Render one template to {subject, html, text}. Raises KeyError on an unknown kind."""
    return TEMPLATES[kind](data or {})
