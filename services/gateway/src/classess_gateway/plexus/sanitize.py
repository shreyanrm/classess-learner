"""SVG sanitizer — every diagram passes through here before it is served.

Rules: the root must be ``<svg>`` with a ``viewBox``; no script / foreignObject /
iframe / object / embed / style elements; no ``on*`` event attributes; hrefs only to
fragments (``#...``) or inline ``data:image/`` payloads. Anything unusable returns
``None`` and the caller serves a seed instead — never an error to the learner.
"""

from __future__ import annotations

import xml.etree.ElementTree as ET

_SVG_NS = "http://www.w3.org/2000/svg"
_XLINK_NS = "http://www.w3.org/1999/xlink"

_FORBIDDEN_TAGS = {"script", "foreignobject", "iframe", "object", "embed", "style"}


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _href_allowed(value: str) -> bool:
    v = value.strip()
    return v.startswith("#") or v.startswith("data:image/")


def _scrub(el: ET.Element) -> None:
    for child in list(el):
        if _local(child.tag).lower() in _FORBIDDEN_TAGS:
            el.remove(child)
        else:
            _scrub(child)
    for attr in list(el.attrib):
        name = _local(attr).lower()
        value = el.attrib[attr]
        if (
            name.startswith("on")
            or "javascript:" in value.lower()
            or (name == "href" and not _href_allowed(value))
            or (name == "style" and "url(" in value.lower())
        ):
            del el.attrib[attr]


def sanitize_svg(text: str) -> str | None:
    """Return a clean inline SVG string, or ``None`` if the input is unusable."""
    if not text:
        return None
    start, end = text.find("<svg"), text.rfind("</svg>")
    if start < 0 or end < 0:
        return None
    fragment = text[start : end + len("</svg>")]
    ET.register_namespace("", _SVG_NS)
    ET.register_namespace("xlink", _XLINK_NS)
    try:
        root = ET.fromstring(fragment)
    except ET.ParseError:
        return None
    if _local(root.tag) != "svg" or not root.get("viewBox"):
        return None
    if _local(root.tag).lower() in _FORBIDDEN_TAGS:
        return None
    _scrub(root)
    return ET.tostring(root, encoding="unicode")
