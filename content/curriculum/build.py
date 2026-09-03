#!/usr/bin/env python3
"""Validate the Wobo global framework registry seed and check every official site.

Standalone by design: standard library only, no imports from this repository, no
network dependencies beyond the sites it checks. Run it from anywhere.

    python3 build.py                     validate, check every site, rewrite the seed
    python3 build.py --offline           validate only, touch nothing
    python3 build.py --only cbse,ib-dp   check a few entries, leave the rest as they are
    python3 build.py --stale-days 30     recheck only entries older than 30 days
    python3 build.py --report            print the table, write nothing

Exit codes: 0 all good, 1 one or more sites did not confirm, 2 the file is invalid.

What a check proves: that on the date recorded, the declared official site answered,
and what that site called itself in its page title. It never promotes a syllabus.
Framework level only, per docs/CURRICULUM.md section 3. When a site answers only to a
browser user agent, or only through a client that completes an incomplete certificate
chain, the entry says so, so nobody later reads a firewall-shaped answer as a clean
one. A title that has nothing to do with the board is the signal that its domain has
lapsed into other hands, which is a thing that happens and which a status code alone
would never catch.
"""

import argparse
import collections
import datetime
import html
import json
import os
import re
import shutil
import ssl
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
SEED = os.path.join(HERE, "frameworks.seed.json")

KINDS = {"national", "state", "international", "open", "homeschool", "online", "personal"}
ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
COUNTRY_RE = re.compile(r"^[A-Z]{2}$")
GRADE_LEVEL_RE = re.compile(r"^(Class|Grade|Year|Stage) (\d+)$")
LANG_RE = re.compile(r"^[a-z]{2,3}$")
MIN_GRADE, MAX_GRADE = 4, 14  # 4 to 13, plus Northern Ireland's Year 14

USER_AGENT = "wobo-curriculum-registry/1.0 (+https://heywobo.com)"
TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
# Titles that mean "a firewall answered", not "the site answered". The host is alive, so
# the check still counts, but the title is no evidence of whose site it is.
BLOCK_PAGE_RE = re.compile(
    r"request rejected|access denied|attention required|just a moment|radware page|"
    r"bot verification|are you a robot|captcha|forbidden|security check", re.IGNORECASE)
BODY_BYTES = 8192
ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"


# --------------------------------------------------------------------------- io

def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f, object_pairs_hook=collections.OrderedDict)


def save(path, doc):
    """Write atomically so an interrupted run never leaves a half file."""
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, path)


def now():
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()


# --------------------------------------------------------------------- validate

def validate(frameworks):
    """Structural checks. Returns (errors, warnings) as lists of strings."""
    errors, warnings = [], []
    seen_ids = {}
    seen_aliases = {}
    names = {}

    def key(text):
        return " ".join(text.split()).casefold()

    for i, e in enumerate(frameworks):
        where = f"entry {i} ({e.get('id', 'no id')})"

        fid = e.get("id")
        if not isinstance(fid, str) or not ID_RE.match(fid):
            errors.append(f"{where}: id must be a lowercase slug")
        elif fid in seen_ids:
            errors.append(f"{where}: duplicate id, first seen at entry {seen_ids[fid]}")
        else:
            seen_ids[fid] = i

        name = e.get("name")
        if not isinstance(name, str) or not name.strip():
            errors.append(f"{where}: name is required")
        else:
            if key(name) in names:
                warnings.append(f"{where}: name repeats entry {names[key(name)]}")
            names[key(name)] = fid

        aliases = e.get("aliases")
        if not isinstance(aliases, list) or not aliases:
            errors.append(f"{where}: aliases must be a non-empty list")
        else:
            for a in aliases:
                if not isinstance(a, str) or not a.strip():
                    errors.append(f"{where}: empty alias")
                    continue
                k = key(a)
                if k in seen_aliases and seen_aliases[k] != fid:
                    errors.append(f"{where}: alias {a!r} already belongs to {seen_aliases[k]}")
                seen_aliases[k] = fid

        if e.get("kind") not in KINDS:
            errors.append("{}: kind must be one of {}".format(where, ", ".join(sorted(KINDS))))

        country = e.get("country")
        if country is not None and not (isinstance(country, str) and COUNTRY_RE.match(country)):
            errors.append(f"{where}: country must be an ISO 3166-1 alpha-2 code or null")

        langs = e.get("languages")
        if not isinstance(langs, list) or not langs:
            errors.append(f"{where}: languages must be a non-empty list")
        else:
            for lang in langs:
                if not isinstance(lang, str) or not LANG_RE.match(lang):
                    errors.append(f"{where}: language {lang!r} is not an ISO 639 code")

        levels = e.get("levels")
        if not isinstance(levels, list) or not levels:
            errors.append(f"{where}: levels must be a non-empty list")
        else:
            if len(set(levels)) != len(levels):
                errors.append(f"{where}: duplicate level names")
            # Only levels named in grade vocabulary are range checked. A framework
            # that names its own stages ("MYP 1", "Secondary 1", "JC2") is left alone.
            for level in levels:
                m = GRADE_LEVEL_RE.match(str(level).strip())
                if m and not MIN_GRADE <= int(m.group(2)) <= MAX_GRADE:
                    warnings.append(f"{where}: level {level!r} sits outside grades 4 to 13")

        site = e.get("official_site")
        if site is not None:
            if not isinstance(site, str):
                errors.append(f"{where}: official_site must be a URL string or null")
            else:
                parts = urllib.parse.urlsplit(site)
                if parts.scheme not in ("http", "https") or not parts.netloc:
                    errors.append(f"{where}: official_site is not an absolute http(s) URL")
        else:
            warnings.append(f"{where}: no official site on record, it stays provisional")

        if e.get("status") == "verified" and not e.get("verified_site"):
            errors.append(f"{where}: status is verified but the site was never confirmed")

    return errors, warnings


# ------------------------------------------------------------------------ check
#
# Three transports, tried in order, first answer wins. Each one that had to be
# reached for is written into the entry's check record, so the file says not just
# whether a site answered but what it took to make it answer.
#
#   1. our own user agent, GET then HEAD      the polite ask
#   2. a browser user agent                   many ministry sites refuse anything else
#   3. the system curl                        completes a certificate chain the server
#                                             serves incompletely, which OpenSSL alone
#                                             will not do
#
# A site that answers only through 2 or 3 is still confirmed as resolving; the note
# on the entry says how, so nobody later mistakes a WAF-shaped answer for a clean one.
#
# Each transport asks for the first 8KB rather than headers alone, so the page title
# lands in the record. That title is the only thing standing between us and a board's
# lapsed domain now serving somebody else's business.

BROWSER_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

HAVE_CURL = shutil.which("curl")


def blank_check():
    return collections.OrderedDict(
        [("ok", False), ("transport", None), ("method", None), ("http_status", None),
         ("final_url", None), ("page_title", None), ("elapsed_ms", None),
         ("note", None), ("error", None)])


def title_of(body):
    """The page title, so a person reviewing the file can see whose site answered.

    This is the only defence against the worst failure mode here: a board's old domain
    lapsing and being picked up by someone else. A site that answers is not proof it is
    still the board's, and a title in the file is something a human can scan.
    """
    if not body:
        return None
    found = TITLE_RE.search(body)
    if not found:
        return None
    text = " ".join(html.unescape(found.group(1)).split())
    return text[:120] or None


def opener():
    return urllib.request.build_opener(
        urllib.request.HTTPSHandler(context=ssl.create_default_context()))


def fetch(url, method, timeout, user_agent):
    req = urllib.request.Request(url, method=method)
    req.add_header("User-Agent", user_agent)
    req.add_header("Accept", ACCEPT)
    req.add_header("Accept-Language", "en")
    if method == "GET":
        req.add_header("Range", "bytes=0-2047")
    return opener().open(req, timeout=timeout)


def try_urllib(url, timeout, user_agent, methods):
    """Returns (status, final_url, method, error, body). status is None if nothing answered."""
    error = None
    for method in methods:
        try:
            with fetch(url, method, timeout, user_agent) as resp:
                body = None
                if method == "GET":
                    raw = resp.read(BODY_BYTES)
                    body = raw.decode(resp.headers.get_content_charset() or "utf-8",
                                      errors="replace")
                return resp.status, resp.geturl(), method, None, body
        except urllib.error.HTTPError as err:
            error = f"HTTP {err.code}"
            if method == "GET" and err.code in (400, 403, 405, 406, 501):
                continue  # some servers answer a HEAD and refuse a GET; let it try
            return err.code, err.url, method, error, None
        except ssl.SSLError as err:
            return None, None, method, f"TLS: {getattr(err, 'reason', None) or err}", None
        except Exception as err:  # DNS, refused, timeout, redirect loop
            return None, None, method, f"{type(err).__name__}: {err}", None
    return None, None, None, error, None


def try_curl(url, timeout):
    """Last resort. curl completes certificate chains that servers serve incomplete."""
    handle, body_path = tempfile.mkstemp(prefix="wobo-registry-", suffix=".html")
    os.close(handle)
    try:
        try:
            done = subprocess.run(
                ["curl", "-sS", "-o", body_path, "-L", "--max-time", str(int(timeout)),
                 "-r", f"0-{BODY_BYTES - 1}", "-A", BROWSER_UA,
                 "-w", "%{http_code} %{url_effective}", url],
                capture_output=True, text=True, timeout=timeout + 10)
        except Exception as err:
            return None, None, f"curl: {type(err).__name__}", None
        parts = done.stdout.strip().split(" ", 1)
        if not parts or not parts[0].isdigit() or parts[0] == "000":
            lines = [ln.strip() for ln in done.stderr.splitlines() if ln.strip()]
            return None, None, (lines[0] if lines else "curl could not connect"), None
        with open(body_path, "rb") as f:
            body = f.read(BODY_BYTES).decode("utf-8", errors="replace")
        return int(parts[0]), (parts[1] if len(parts) > 1 else url), None, body
    finally:
        try:
            os.unlink(body_path)
        except OSError:
            pass


def probe(url, timeout, retries):
    rec = blank_check()
    started = time.time()

    for attempt in range(retries + 1):
        # The last status anything came back with, so a refusal seen only by the third
        # transport is still what the record reports.
        seen_status = None
        why = None

        status, final, method, error, body = try_urllib(
            url, timeout, USER_AGENT, ("GET", "HEAD"))
        if status is not None and status < 400:
            rec.update(ok=True, transport="direct", method=method, http_status=status,
                       final_url=final, page_title=title_of(body))
            break
        seen_status = status if status is not None else seen_status
        why = error or (f"HTTP {status}" if status is not None else None)

        if status is None or status in (401, 403, 406, 409, 429, 500, 503):
            status2, final2, _, error2, body2 = try_urllib(
                url, timeout, BROWSER_UA, ("GET",))
            if status2 is not None and status2 < 400:
                rec.update(ok=True, transport="browser-user-agent", method="GET",
                           http_status=status2, final_url=final2,
                           page_title=title_of(body2),
                           note="answered only to a browser user agent")
                break
            seen_status = status2 if status2 is not None else seen_status
            why = error2 or (f"HTTP {status2}" if status2 is not None else why)

        if HAVE_CURL:
            status3, final3, error3, body3 = try_curl(url, timeout)
            if status3 is not None and status3 < 400:
                rec.update(ok=True, transport="curl", method="GET",
                           http_status=status3, final_url=final3,
                           page_title=title_of(body3),
                           note="confirmed through the system curl, which completes the "
                                "certificate chain this server serves incomplete")
                break
            seen_status = status3 if status3 is not None else seen_status
            why = error3 or (f"HTTP {status3}" if status3 is not None else why)

        rec.update(http_status=seen_status, error=why or "nothing answered")
        if attempt < retries:
            time.sleep(1.5 * (attempt + 1))

    if rec["ok"] and rec["page_title"] and BLOCK_PAGE_RE.search(rec["page_title"]):
        blocked = "the answer was a bot-protection page, not the site's own content"
        rec["note"] = f"{rec['note']}; {blocked}" if rec["note"] else blocked

    rec["elapsed_ms"] = int((time.time() - started) * 1000)
    if rec["ok"]:
        rec["error"] = None
    return rec


def host_of(url):
    """Hostname without a leading www, for comparing a redirect against the declared site."""
    host = urllib.parse.urlsplit(url).netloc.lower().split("@")[-1]
    return host[4:] if host.startswith("www.") else host


def check_entry(entry, args):
    site = entry.get("official_site")
    if not site:
        rec = blank_check()
        rec["error"] = "no official site on record"
        return entry, None, rec
    rec = probe(site, args.timeout, args.retries)
    if rec["ok"] and rec["final_url"] and host_of(site) != host_of(rec["final_url"]):
        rec["redirected_to"] = host_of(rec["final_url"])
    return entry, rec["ok"], rec


# ------------------------------------------------------------------------- main

def summarise(frameworks):
    by_kind = collections.Counter(e.get("kind") for e in frameworks)
    by_country = collections.Counter(e.get("country") or "international" for e in frameworks)
    return collections.OrderedDict([
        ("total", len(frameworks)),
        ("verified", sum(1 for e in frameworks if e.get("status") == "verified")),
        ("provisional", sum(1 for e in frameworks if e.get("status") != "verified")),
        ("without_official_site", sum(1 for e in frameworks if not e.get("official_site"))),
        ("countries", len([c for c in by_country if c != "international"])),
        ("by_kind", collections.OrderedDict(sorted(by_kind.items()))),
    ])


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--file", default=SEED, help="seed file to read and rewrite")
    p.add_argument("--offline", action="store_true", help="validate only, no network, no write")
    p.add_argument("--report", action="store_true", help="check and print, but do not write")
    p.add_argument("--only", default=None, help="comma separated ids to check")
    p.add_argument("--stale-days", type=int, default=None,
                   help="skip entries checked more recently than this")
    p.add_argument("--workers", type=int, default=8)
    p.add_argument("--timeout", type=float, default=20.0)
    p.add_argument("--retries", type=int, default=1)
    args = p.parse_args(argv)

    # A full run takes minutes. Line buffering means progress reaches a log file or a
    # pipe as it happens, rather than all at once when the run ends.
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except (AttributeError, ValueError):
        pass

    doc = load(args.file)
    frameworks = doc.get("frameworks")
    if not isinstance(frameworks, list) or not frameworks:
        print(f"no frameworks in {args.file}", file=sys.stderr)
        return 2

    errors, warnings = validate(frameworks)
    for w in warnings:
        print(f"warning: {w}")
    if errors:
        for e in errors:
            print(f"error: {e}", file=sys.stderr)
        print(f"\n{len(errors)} error(s). Nothing was written.", file=sys.stderr)
        return 2
    print(f"validated {len(frameworks)} entries, {len(warnings)} warning(s)")

    if args.offline:
        return 0

    wanted = set(args.only.split(",")) if args.only else None
    cutoff = None
    if args.stale_days is not None:
        cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=args.stale_days)

    queue = []
    for e in frameworks:
        if wanted is not None and e["id"] not in wanted:
            continue
        if cutoff is not None and e.get("checked_at"):
            try:
                if datetime.datetime.fromisoformat(e["checked_at"]) > cutoff:
                    continue
            except ValueError:
                pass
        queue.append(e)

    print(f"checking {len(queue)} official site(s) with {args.workers} workers")
    stamp = now()
    confirmed = failed = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for entry, ok, rec in pool.map(lambda e: check_entry(e, args), queue):
            entry["verified_site"] = None if ok is None else bool(ok)
            entry["checked_at"] = stamp
            entry["status"] = "verified" if ok else "provisional"
            entry["check"] = rec
            if ok:
                confirmed += 1
                if args.report:
                    # The title is the review surface. Read it against the entry's name.
                    print("  confirmed    {:<34} {}".format(
                        entry["id"], rec.get("page_title") or "(no title on the page)"))
            else:
                failed += 1
                site = entry.get("official_site") or "(no site)"
                why = rec.get("error") or rec.get("http_status")
                print(f"  unconfirmed  {entry['id']:<34} {site}  {why}")

    doc["last_build"] = stamp
    doc["counts"] = summarise(frameworks)

    print(f"\nconfirmed {confirmed}, unconfirmed {failed}, of {len(queue)} checked")
    counts = doc["counts"]
    print(
        f"registry now: {counts['total']} entries, "
        f"{counts['verified']} verified, {counts['provisional']} provisional"
    )

    if args.report:
        print("(report only, nothing written)")
        return 0 if failed == 0 else 1

    save(args.file, doc)
    print(f"wrote {args.file}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
