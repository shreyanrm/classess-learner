"""SVG sanitizer — every diagram passes through here before it is served.

Rules: the root must be ``<svg>`` with a ``viewBox`` (and always carries the SVG namespace on
the way out); no script / foreignObject / iframe / object / embed / style / set elements, and no
``animate*`` element that targets a URL attribute; no ``on*`` event attributes; href, xlink:href
and src only to fragments (``#...``) or inline ``data:image/`` payloads, and an animation's
to/from/values/by held to the same rule. Anything unusable returns ``None`` and the caller
serves a seed instead — never an error to the learner.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET

_SVG_NS = "http://www.w3.org/2000/svg"
_XLINK_NS = "http://www.w3.org/1999/xlink"

# ``set`` is the one that looks harmless: <set attributeName="href" to="javascript:..."/> rewrites
# an attribute we already checked, AFTER we checked it. It belongs with script and foreignObject.
_FORBIDDEN_TAGS = {"script", "foreignobject", "iframe", "object", "embed", "style", "set"}

# SMIL animation elements can retarget an attribute the same way ``set`` does, over time.
_ANIMATION_TAGS = {"animate", "animatetransform", "animatemotion", "animatecolor"}

# The attributes that carry a URL, whichever spelling the document uses. ``href`` alone let
# ``src`` and the xlink-prefixed spelling through untouched.
_URL_ATTRS = {"href", "src"}

# Where an animation puts the values it will write into its target attribute.
_ANIMATION_VALUE_ATTRS = {"to", "from", "values", "by"}


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


_RASTER_DATA = ("data:image/png;base64,", "data:image/jpeg;base64,", "data:image/webp;base64,")


def _href_allowed(value: str) -> bool:
    # Fragments and raster data images only. data:image/svg+xml is explicitly out —
    # a nested SVG payload is a sanitizer bypass, not an image.
    v = value.strip().lower()
    return v.startswith("#") or v.startswith(_RASTER_DATA)


def _animates_a_url(el: ET.Element) -> bool:
    """Does this animation element write into an attribute that carries a URL?

    ``<animate attributeName="xlink:href" to="javascript:…"/>`` sets the very attribute the
    attribute pass already cleared, one frame later. The element goes, not the attribute.
    """
    target = _local(el.get("attributeName") or "").lower()
    return any(name in target for name in _URL_ATTRS)


def _scrub(el: ET.Element) -> None:
    for child in list(el):
        tag = _local(child.tag).lower()
        if tag in _FORBIDDEN_TAGS or (tag in _ANIMATION_TAGS and _animates_a_url(child)):
            el.remove(child)
        else:
            _scrub(child)
    is_animation = _local(el.tag).lower() in _ANIMATION_TAGS
    for attr in list(el.attrib):
        name = _local(attr).lower()
        value = el.attrib[attr]
        if (
            name.startswith("on")
            or "javascript:" in value.lower()
            # href, src and the xlink: spelling of either — _local() strips the prefix, so one
            # membership test covers href, xlink:href and src alike.
            or (name in _URL_ATTRS and not _href_allowed(value))
            # An animation's to/from/values/by are future attribute values: hold them to the
            # same rule the attribute itself is held to, so nothing arrives by animating in.
            or (
                is_animation
                and name in _ANIMATION_VALUE_ATTRS
                and not all(_href_allowed(v) for v in value.split(";") if v.strip())
            )
            or (name == "style" and "url(" in value.lower())
        ):
            del el.attrib[attr]


def sanitize_svg(text: str) -> str | None:
    """Return a clean inline SVG string, or ``None`` if the input is unusable."""
    if not text:
        return None
    # No markup declarations of any kind (DOCTYPE, ENTITY, CDATA — anything but comments):
    # kills XXE and entity-expansion (billion laughs) BEFORE the parser ever runs, without
    # relying on string spellings a crafted payload could dodge.
    if re.search(r"<!(?!--)", text):
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
    # Force the SVG namespace back onto the root. A fragment parsed WITHOUT an xmlns serializes
    # without one, and a namespace-less <svg> is inert in a browser — which made every sanitized
    # diagram render blank and look permanently stale to the cache.
    if not root.tag.startswith("{"):
        root.set("xmlns", _SVG_NS)
    return ET.tostring(root, encoding="unicode")
