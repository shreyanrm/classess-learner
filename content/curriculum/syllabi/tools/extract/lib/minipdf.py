"""Minimal PDF text extractor. Python standard library only (re, zlib, hashlib).

Handles: classic `N G obj` bodies, object streams (/Type /ObjStm), FlateDecode
(with PNG/TIFF predictors), the page tree, page content streams, Tj/TJ/'/" text
operators, WinAnsi/Standard single-byte fonts and Identity-H CID fonts via their
/ToUnicode CMap. Good enough for the text-bearing syllabus PDFs published by
Indian boards; not a general-purpose PDF library.
"""

import contextlib
import re
import zlib

# ---------------------------------------------------------------- tokenising

WS = b"\x00\t\n\x0c\r "
DELIM = b"()<>[]{}/%"


def _skip_ws(b, i):
    n = len(b)
    while i < n:
        c = b[i : i + 1]
        if c == b"%":
            while i < n and b[i : i + 1] not in (b"\r", b"\n"):
                i += 1
        elif c in (bytes([x]) for x in WS) or b[i] in WS:
            i += 1
        else:
            break
    return i


def parse_object(b, i=0):
    """Return (value, next_index). Values: dict, list, bytes(string), float/int,
    bool, None, ('name', str), ('ref', num, gen), ('op', bytes)."""
    i = _skip_ws(b, i)
    if i >= len(b):
        return None, i
    c = b[i : i + 1]
    if c == b"<" and b[i + 1 : i + 2] == b"<":
        i += 2
        d = {}
        while True:
            i = _skip_ws(b, i)
            if b[i : i + 2] == b">>":
                return d, i + 2
            if i >= len(b):
                return d, i
            k, i = parse_object(b, i)
            if not (isinstance(k, tuple) and k[0] == "name"):
                # malformed; bail
                return d, i
            v, i = parse_object(b, i)
            d[k[1]] = v
    if c == b"[":
        i += 1
        arr = []
        while True:
            i = _skip_ws(b, i)
            if b[i : i + 1] == b"]":
                return arr, i + 1
            if i >= len(b):
                return arr, i
            v, i = parse_object(b, i)
            arr.append(v)
    if c == b"(":
        i += 1
        depth = 1
        out = bytearray()
        while i < len(b):
            ch = b[i]
            if ch == 0x5C:  # backslash
                nx = b[i + 1 : i + 2]
                mapping = {
                    b"n": 10,
                    b"r": 13,
                    b"t": 9,
                    b"b": 8,
                    b"f": 12,
                    b"(": 40,
                    b")": 41,
                    b"\\": 92,
                }
                if nx in mapping:
                    out.append(mapping[nx])
                    i += 2
                    continue
                if nx.isdigit():
                    oct_digits = b""
                    j = i + 1
                    while j < len(b) and len(oct_digits) < 3 and b[j : j + 1].isdigit():
                        oct_digits += b[j : j + 1]
                        j += 1
                    out.append(int(oct_digits, 8) & 0xFF)
                    i = j
                    continue
                if nx in (b"\n", b"\r"):
                    i += 2
                    if nx == b"\r" and b[i : i + 1] == b"\n":
                        i += 1
                    continue
                i += 1
                continue
            if ch == 0x28:
                depth += 1
            elif ch == 0x29:
                depth -= 1
                if depth == 0:
                    return bytes(out), i + 1
            out.append(ch)
            i += 1
        return bytes(out), i
    if c == b"<":
        j = b.index(b">", i)
        hx = re.sub(rb"[^0-9A-Fa-f]", b"", b[i + 1 : j])
        if len(hx) % 2:
            hx += b"0"
        return bytes.fromhex(hx.decode()), j + 1
    if c == b"/":
        j = i + 1
        while j < len(b) and b[j] not in WS and b[j : j + 1] not in [bytes([d]) for d in DELIM]:
            j += 1
        name = b[i + 1 : j]
        name = re.sub(rb"#([0-9A-Fa-f]{2})", lambda m: bytes([int(m.group(1), 16)]), name)
        return ("name", name.decode("latin-1")), j
    if c == b"]" or c == b">":
        return ("op", c), i + 1
    # number, ref, keyword or operator
    m = re.match(rb"[+-]?\d+\.?\d*|[+-]?\.\d+", b[i : i + 40])
    if m:
        tok = m.group(0)
        j = i + len(tok)
        ref = re.match(rb"\s+(\d+)\s+R(?![A-Za-z0-9])", b[j : j + 24])
        if ref and re.fullmatch(rb"\d+", tok):
            return ("ref", int(tok), int(ref.group(1))), j + ref.end()
        if b"." in tok:
            return float(tok), j
        return int(tok), j
    m = re.match(rb"[A-Za-z'\"*][A-Za-z0-9'\"*]*", b[i : i + 40])
    if m:
        tok = m.group(0)
        j = i + len(tok)
        if tok == b"true":
            return True, j
        if tok == b"false":
            return False, j
        if tok == b"null":
            return None, j
        return ("op", tok), j
    return ("op", c), i + 1


# ------------------------------------------------------------------ document


class PDF:
    def __init__(self, data: bytes):
        self.data = data
        self.objs = {}  # num -> (offset, kind) lazily resolved bodies
        self._cache = {}
        self._scan_plain()
        self._scan_objstm()

    # -- object discovery -------------------------------------------------
    def _scan_plain(self):
        for m in re.finditer(rb"(?<![0-9])(\d{1,7})\s+(\d{1,5})\s+obj\b", self.data):
            self.objs[int(m.group(1))] = ("plain", m.end())

    def _scan_objstm(self):
        for num in [n for n, (k, _) in list(self.objs.items()) if k == "plain"]:
            try:
                d = self.get(num)
            except Exception:
                continue
            if isinstance(d, dict) and d.get("Type") == ("name", "ObjStm"):
                try:
                    payload = self.stream_data(num)
                except Exception:
                    continue
                n = self.resolve(d.get("N")) or 0
                first = self.resolve(d.get("First")) or 0
                header = payload[:first].split()
                try:
                    pairs = [(int(header[i]), int(header[i + 1])) for i in range(0, 2 * n, 2)]
                except Exception:
                    continue
                for onum, off in pairs:
                    if onum not in self.objs or self.objs[onum][0] == "objstm":
                        self.objs[onum] = ("objstm", (payload, first + off))

    def get(self, num):
        if num in self._cache:
            return self._cache[num]
        ent = self.objs.get(num)
        if ent is None:
            return None
        kind, loc = ent
        if kind == "plain":
            val, _ = parse_object(self.data, loc)
        else:
            payload, off = loc
            val, _ = parse_object(payload, off)
        self._cache[num] = val
        return val

    def resolve(self, v, depth=0):
        while isinstance(v, tuple) and v and v[0] == "ref" and depth < 32:
            v = self.get(v[1])
            depth += 1
        return v

    # -- streams ----------------------------------------------------------
    def stream_data(self, num):
        kind, loc = self.objs[num]
        if kind != "plain":
            return b""
        d, j = parse_object(self.data, loc)
        m = re.compile(rb"stream\r\n|stream\n|stream\r").search(self.data, j, j + 4096)
        if not m:
            return b""
        start = m.end()
        length = self.resolve(d.get("Length")) if isinstance(d, dict) else None
        raw = None
        if isinstance(length, int) and length >= 0:
            cand = self.data[start : start + length]
            tail = self.data[start + length : start + length + 20]
            if b"endstream" in tail:
                raw = cand
        if raw is None:
            e = self.data.find(b"endstream", start)
            raw = self.data[start : e if e != -1 else len(self.data)]
            raw = raw.rstrip(b"\r\n")
        return self._decode(raw, d)

    def _decode(self, raw, d):
        filt = self.resolve(d.get("Filter"))
        if filt is None:
            return raw
        filters = filt if isinstance(filt, list) else [filt]
        parms = self.resolve(d.get("DecodeParms")) or self.resolve(d.get("DP"))
        parms = parms if isinstance(parms, list) else [parms]
        out = raw
        for idx, f in enumerate(filters):
            f = self.resolve(f)
            name = f[1] if isinstance(f, tuple) and f[0] == "name" else None
            if name in ("FlateDecode", "Fl"):
                try:
                    out = zlib.decompress(out)
                except zlib.error:
                    try:
                        out = zlib.decompressobj().decompress(out)
                    except Exception:
                        return b""
                p = self.resolve(parms[idx]) if idx < len(parms) else None
                if isinstance(p, dict):
                    out = self._unpredict(out, p)
            elif name in ("ASCIIHexDecode", "AHx"):
                hx = re.sub(rb"[^0-9A-Fa-f]", b"", out.split(b">")[0])
                if len(hx) % 2:
                    hx += b"0"
                out = bytes.fromhex(hx.decode())
            elif name in ("ASCII85Decode", "A85"):
                import base64

                body = out.strip()
                if body.startswith(b"<~"):
                    body = body[2:]
                body = body.split(b"~>")[0]
                try:
                    out = base64.a85decode(body)
                except Exception:
                    return b""
            elif name == "LZWDecode":
                out = _lzw(out)
                p = self.resolve(parms[idx]) if idx < len(parms) else None
                if isinstance(p, dict):
                    out = self._unpredict(out, p)
            else:
                return b""  # image or unsupported filter
        return out

    def _unpredict(self, data, p):
        pred = self.resolve(p.get("Predictor")) or 1
        if pred < 2:
            return data
        colors = self.resolve(p.get("Colors")) or 1
        bpc = self.resolve(p.get("BitsPerComponent")) or 8
        cols = self.resolve(p.get("Columns")) or 1
        bpp = max(1, (colors * bpc) // 8)
        rowlen = (cols * colors * bpc + 7) // 8
        if pred == 2:
            return data
        out = bytearray()
        prev = bytearray(rowlen)
        i = 0
        while i + 1 + rowlen <= len(data) + rowlen and i < len(data):
            ft = data[i]
            i += 1
            row = bytearray(data[i : i + rowlen])
            i += rowlen
            if len(row) < rowlen:
                row.extend(b"\x00" * (rowlen - len(row)))
            for k in range(rowlen):
                a = row[k - bpp] if k >= bpp else 0
                b_ = prev[k]
                c = prev[k - bpp] if k >= bpp else 0
                x = row[k]
                if ft == 0:
                    v = x
                elif ft == 1:
                    v = x + a
                elif ft == 2:
                    v = x + b_
                elif ft == 3:
                    v = x + ((a + b_) >> 1)
                elif ft == 4:
                    pa, pb, pc = abs(b_ - c), abs(a - c), abs(a + b_ - 2 * c)
                    pr = a if (pa <= pb and pa <= pc) else (b_ if pb <= pc else c)
                    v = x + pr
                else:
                    v = x
                row[k] = v & 0xFF
            out.extend(row)
            prev = row
        return bytes(out)

    # -- page tree --------------------------------------------------------
    def pages(self):
        root = None
        for num in self.objs:
            d = self.get(num)
            if isinstance(d, dict) and d.get("Type") == ("name", "Catalog"):
                root = d
                break
        out = []
        if root is not None:
            node = self.resolve(root.get("Pages"))
            if isinstance(node, dict):
                self._walk(node, out, set(), {})
        if not out:
            for num in sorted(self.objs):
                d = self.get(num)
                if isinstance(d, dict) and d.get("Type") == ("name", "Page"):
                    out.append(d)
        return out

    _INHERIT = ("Resources", "MediaBox", "CropBox", "Rotate")

    def _walk(self, node, out, seen, inherited):
        nid = id(node)
        if nid in seen or len(out) > 5000:
            return
        seen.add(nid)
        inh = dict(inherited)
        for k in self._INHERIT:
            if k in node:
                inh[k] = node[k]
        kids = self.resolve(node.get("Kids"))
        if isinstance(kids, list):
            for kid in kids:
                k = self.resolve(kid)
                if isinstance(k, dict):
                    self._walk(k, out, seen, inh)
        elif node.get("Type") == ("name", "Page") or "Contents" in node:
            merged = dict(inh)
            merged.update(node)
            out.append(merged)

    # -- text -------------------------------------------------------------
    def page_text(self, page):
        contents = page.get("Contents")
        chunks = []
        items = contents if isinstance(contents, list) else [contents]
        for it in items:
            if isinstance(it, tuple) and it[0] == "ref":
                with contextlib.suppress(Exception):
                    chunks.append(self.stream_data(it[1]))
        content = b"\n".join(c for c in chunks if c)
        fonts = self._page_fonts(page)
        return render_content(content, fonts)

    def _page_fonts(self, page):
        res = self.resolve(page.get("Resources"))
        fonts = {}
        if not isinstance(res, dict):
            return fonts
        fd = self.resolve(res.get("Font"))
        if not isinstance(fd, dict):
            return fonts
        for key, ref in fd.items():
            f = self.resolve(ref)
            if not isinstance(f, dict):
                continue
            fonts[key] = self._font_map(f)
        return fonts

    def _font_map(self, f):
        """Return (kind, table) where kind is 'simple' or 'cid'."""
        tou = self.resolve(f.get("ToUnicode"))
        table = {}
        if isinstance(tou, tuple):
            pass
        raw_ref = f.get("ToUnicode")
        if isinstance(raw_ref, tuple) and raw_ref[0] == "ref":
            try:
                table = parse_tounicode(self.stream_data(raw_ref[1]))
            except Exception:
                table = {}
        sub = f.get("Subtype")
        enc = self.resolve(f.get("Encoding"))
        two_byte = False
        if sub == ("name", "Type0"):
            two_byte = True
            if isinstance(enc, tuple) and enc[0] == "name" and "Identity" not in enc[1]:
                two_byte = True
        return ("cid" if two_byte else "simple", table)


def _lzw(data):
    out = bytearray()
    table = {i: bytes([i]) for i in range(256)}
    nxt, width = 258, 9
    prev = None
    buf = bits = 0
    for byte in data:
        buf = (buf << 8) | byte
        bits += 8
        while bits >= width:
            code = (buf >> (bits - width)) & ((1 << width) - 1)
            bits -= width
            if code == 256:
                table = {i: bytes([i]) for i in range(256)}
                nxt, width, prev = 258, 9, None
                continue
            if code == 257:
                return bytes(out)
            if prev is None:
                entry = table.get(code, b"")
            elif code in table:
                entry = table[code]
            else:
                entry = prev + prev[:1]
            out.extend(entry)
            if prev is not None:
                table[nxt] = prev + entry[:1]
                nxt += 1
                if nxt + 1 >= (1 << width) and width < 12:
                    width += 1
            prev = entry
    return bytes(out)


HEXPAIR = re.compile(rb"<([0-9A-Fa-f\s]*)>")


def parse_tounicode(stream):
    table = {}
    txt = stream
    for m in re.finditer(rb"beginbfchar(.*?)endbfchar", txt, re.S):
        toks = HEXPAIR.findall(m.group(1))
        for i in range(0, len(toks) - 1, 2):
            src = re.sub(rb"\s", b"", toks[i])
            dst = re.sub(rb"\s", b"", toks[i + 1])
            if not src or not dst:
                continue
            with contextlib.suppress(ValueError):
                table[int(src, 16)] = _utf16be(dst)
    for m in re.finditer(rb"beginbfrange(.*?)endbfrange", txt, re.S):
        body = m.group(1)
        pos = 0
        while True:
            a = HEXPAIR.search(body, pos)
            if not a:
                break
            b = HEXPAIR.search(body, a.end())
            if not b:
                break
            lo = int(re.sub(rb"\s", b"", a.group(1)) or b"0", 16)
            hi = int(re.sub(rb"\s", b"", b.group(1)) or b"0", 16)
            rest = body[b.end() :]
            arr = re.match(rb"\s*\[", rest)
            if arr:
                depth, k = 1, b.end() + arr.end()
                while k < len(body) and depth:
                    if body[k : k + 1] == b"[":
                        depth += 1
                    elif body[k : k + 1] == b"]":
                        depth -= 1
                    k += 1
                items = HEXPAIR.findall(body[b.end() : k])
                for off, it in enumerate(items):
                    table[lo + off] = _utf16be(re.sub(rb"\s", b"", it))
                pos = k
                continue
            c = HEXPAIR.search(body, b.end())
            if not c:
                break
            base = re.sub(rb"\s", b"", c.group(1))
            if base:
                try:
                    start = int(base, 16)
                except ValueError:
                    start = 0
                width = max(1, len(base) // 4)
                for off in range(0, min(hi - lo + 1, 65536)):
                    table[lo + off] = _cp(start + off, width)
            pos = c.end()
    return table


def _utf16be(hexbytes):
    try:
        raw = bytes.fromhex(hexbytes.decode())
    except Exception:
        return ""
    if len(raw) % 2:
        raw += b"\x00"
    try:
        return raw.decode("utf-16-be", "ignore")
    except Exception:
        return ""


def _cp(value, width):
    try:
        if width <= 1 or value < 0x10000:
            return chr(value)
        return chr(value)
    except Exception:
        return ""


def render_content(content, fonts):
    """Walk a content stream and rebuild lines using text-positioning operators."""
    out_lines = []
    cur = []
    stack = []
    i = 0
    font = ("simple", {})
    tm_y = None
    tm_x = None
    n = len(content)
    while i < n:
        v, j = parse_object(content, i)
        if j <= i:
            j = i + 1
        if isinstance(v, tuple) and v and v[0] == "op":
            op = v[1]
            if op == b"BT":
                stack = []
                tm_y = tm_x = None
            elif op == b"Tf":
                # operands: /Name size
                if len(stack) >= 2 and isinstance(stack[-2], tuple) and stack[-2][0] == "name":
                    font = fonts.get(stack[-2][1], ("simple", {}))
            elif op in (b"Td", b"TD"):
                if len(stack) >= 2 and isinstance(stack[-1], (int, float)):
                    dy = stack[-1]
                    if dy != 0:
                        _flush(cur, out_lines)
            elif op == b"Tm":
                if len(stack) >= 6:
                    y = stack[-1]
                    x = stack[-2]
                    if tm_y is not None and isinstance(y, (int, float)):
                        if abs(y - tm_y) > 1.2:
                            _flush(cur, out_lines)
                        elif (
                            isinstance(x, (int, float))
                            and isinstance(tm_x, (int, float))
                            and x - tm_x > 6
                        ):
                            cur.append(" ")
                    tm_y = y if isinstance(y, (int, float)) else tm_y
                    tm_x = x if isinstance(x, (int, float)) else tm_x
            elif op in (b"T*", b"'", b'"'):
                _flush(cur, out_lines)
                if op in (b"'", b'"'):
                    s = next((o for o in reversed(stack) if isinstance(o, bytes)), None)
                    if s is not None:
                        cur.append(decode_string(s, font))
            elif op == b"Tj":
                if stack and isinstance(stack[-1], bytes):
                    cur.append(decode_string(stack[-1], font))
            elif op == b"TJ":
                arr = stack[-1] if stack and isinstance(stack[-1], list) else []
                for el in arr:
                    if isinstance(el, bytes):
                        cur.append(decode_string(el, font))
                    elif isinstance(el, (int, float)) and el < -140:
                        cur.append(" ")
            elif op == b"ET":
                _flush(cur, out_lines)
            stack = []
        else:
            stack.append(v)
            if len(stack) > 12:
                stack = stack[-12:]
        i = j
    _flush(cur, out_lines)
    return "\n".join(out_lines)


def _flush(cur, out_lines):
    if cur:
        line = "".join(cur)
        line = re.sub(r"[ \t]+", " ", line).strip()
        if line:
            out_lines.append(line)
        cur.clear()


WINANSI = {
    0x80: "€",
    0x82: "‚",
    0x83: "ƒ",
    0x84: "„",
    0x85: "…",
    0x86: "†",
    0x87: "‡",
    0x88: "ˆ",
    0x89: "‰",
    0x8A: "Š",
    0x8B: "‹",
    0x8C: "Œ",
    0x8E: "Ž",
    0x91: "'",
    0x92: "'",
    0x93: '"',
    0x94: '"',
    0x95: "•",
    0x96: "-",
    0x97: "-",
    0x98: "˜",
    0x99: "™",
    0x9A: "š",
    0x9B: "›",
    0x9C: "œ",
    0x9E: "ž",
    0x9F: "Ÿ",
}


def decode_string(raw, font):
    kind, table = font
    out = []
    if kind == "cid":
        for k in range(0, len(raw) - 1, 2):
            code = (raw[k] << 8) | raw[k + 1]
            out.append(table.get(code, ""))
        return "".join(out)
    for byte in raw:
        if table and byte in table:
            out.append(table[byte])
        elif byte in WINANSI:
            out.append(WINANSI[byte])
        elif 32 <= byte < 127:
            out.append(chr(byte))
        elif byte >= 160:
            out.append(bytes([byte]).decode("latin-1"))
        else:
            out.append(" ")
    return "".join(out)


def extract_pages(data):
    """[(page_number_1_based, text)]"""
    doc = PDF(data)
    res = []
    for idx, page in enumerate(doc.pages(), start=1):
        try:
            res.append((idx, doc.page_text(page)))
        except Exception:
            res.append((idx, ""))
    return res
