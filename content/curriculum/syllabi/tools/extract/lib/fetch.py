import hashlib, json, os, re, ssl, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
import minipdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
TXT = os.path.join(ROOT, "txt")
META = os.path.join(ROOT, "meta")
for d in (SRC, TXT, META):
    os.makedirs(d, exist_ok=True)

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"


def slug(u):
    return re.sub(r"[^A-Za-z0-9]+", "_", u.split("://")[-1])[:150]


def fetch(url, key=None, timeout=90):
    key = key or slug(url)
    mpath = os.path.join(META, key + ".json")
    if os.path.exists(mpath):
        return json.load(open(mpath))
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
        raw = r.read()
        final = r.geturl()
        ctype = r.headers.get("Content-Type", "")
    ext = ".pdf" if (raw[:5] == b"%PDF-" or "pdf" in ctype.lower()) else ".html"
    open(os.path.join(SRC, key + ext), "wb").write(raw)
    if ext == ".pdf":
        pages = minipdf.extract_pages(raw)
        text = "\n".join("\f[page %d]\n%s" % (n, t) for n, t in pages)
        npages = len(pages)
    else:
        s = raw.decode("utf-8", "replace")
        s = re.sub(r"(?is)<(script|style).*?</\1>", " ", s)
        s = re.sub(r"(?s)<[^>]+>", "\n", s)
        import html as _h
        text = re.sub(r"\n{3,}", "\n\n", _h.unescape(s))
        npages = 0
    open(os.path.join(TXT, key + ".txt"), "w", encoding="utf-8").write(text)
    meta = {
        "url": url, "final_url": final, "key": key, "kind": ext[1:],
        "bytes": len(raw), "pages": npages,
        "document_sha256": hashlib.sha256(raw).hexdigest(),
        "text_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "content_type": ctype,
    }
    json.dump(meta, open(mpath, "w"), indent=2)
    return meta


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        if "=" in arg and not arg.startswith("http"):
            k, u = arg.split("=", 1)
        else:
            k, u = None, arg
        try:
            m = fetch(u, k)
            print("OK  %-40s pages=%-4s bytes=%-9s %s" % (m["key"][:40], m["pages"], m["bytes"], m["document_sha256"][:12]))
        except Exception as e:
            print("ERR %s :: %r" % (u, e))
