#!/usr/bin/env python3
"""Regenerates ~/Documents/wobo-progress/index.html from docs/WOBO-TASKS.md, git, and a curated gallery manifest.
Run: python3 progress-board.py [--gallery manifest.json]
"""
import base64, datetime, html, json, os, re, shutil, subprocess, sys

# The repository this board reports on: two levels up from tools/progress/, so a clone
# anywhere on disk works and no machine's absolute path is baked into the script.
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.expanduser("~/Documents/wobo-progress")
GALLERY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "progress-gallery.json")
os.makedirs(os.path.join(OUT, "proofs"), exist_ok=True)

def sh(cmd):
    return subprocess.run(cmd, cwd=REPO, shell=True, capture_output=True, text=True).stdout.strip()

# ---- tasks per wave ----
tasks = open(os.path.join(REPO, "docs/WOBO-TASKS.md")).read()
waves = []
cur = None
for line in tasks.splitlines():
    m = re.match(r"^##\s+(.*)", line)
    if m:
        cur = {"title": m.group(1).strip(), "done": 0, "open": 0, "open_items": []}
        waves.append(cur); continue
    if cur is None: continue
    if re.match(r"^\s*- \[x\]", line, re.I): cur["done"] += 1
    elif re.match(r"^\s*- \[ \]", line):
        cur["open"] += 1
        t = re.sub(r"^\s*- \[ \]\s*", "", line); t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)
        cur["open_items"].append(t.split(" — ")[0][:90])
waves = [w for w in waves if w["done"] + w["open"] > 0]
total_done = sum(w["done"] for w in waves); total = sum(w["done"] + w["open"] for w in waves)

# ---- landed (git) ----
head = sh("git log -1 --format='%h · %ad' --date=format:'%d %b %H:%M'")
recent = sh("git log --since='36 hours ago' --format='%h|%s' | head -30").splitlines()
recent = [r.split("|", 1) for r in recent if "|" in r]

# ---- gallery ----
gallery = []
if os.path.exists(GALLERY):
    for item in json.load(open(GALLERY)):
        src = os.path.expanduser(item["src"])
        if not os.path.exists(src): continue
        name = os.path.basename(src)
        dst = os.path.join(OUT, "proofs", name)
        shutil.copyfile(src, dst)
        gallery.append({"file": "proofs/" + name, "caption": item.get("caption", name), "group": item.get("group", "Latest")})

waiting = json.load(open(GALLERY.replace("progress-gallery.json", "progress-waiting.json"))) if os.path.exists(GALLERY.replace("progress-gallery.json", "progress-waiting.json")) else []
running = json.load(open(GALLERY.replace("progress-gallery.json", "progress-running.json"))) if os.path.exists(GALLERY.replace("progress-gallery.json", "progress-running.json")) else []

def pct(w):
    n = w["done"] + w["open"]; return int(round(100 * w["done"] / n)) if n else 0

now = datetime.datetime.now().strftime("%d %b %Y, %H:%M")
groups = {}
for g in gallery: groups.setdefault(g["group"], []).append(g)

H = []
H.append(f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wobo progress</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Caveat:wght@600&display=swap" rel="stylesheet">
<style>
:root{{--paper:#FBFBF9;--ink:#1A1A1F;--ink2:#5C5C66;--ink3:#9A9AA6;--hair:rgba(26,26,31,.14);--pig:#1F35E0;--frost:rgba(31,53,224,.06)}}
@media (prefers-color-scheme:dark){{:root{{--paper:#0D0D10;--ink:#EDEDF1;--ink2:#A9A9B4;--ink3:#6E6E7A;--hair:rgba(237,237,241,.14);--pig:#7B8CFF;--frost:rgba(123,140,255,.08)}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--paper);color:var(--ink);font:400 15px/1.55 Poppins,system-ui,sans-serif}}
.wrap{{width:min(1180px,calc(100% - 40px));margin:0 auto;padding:36px 0 80px}}
h1{{font:600 30px/1.1 Poppins;letter-spacing:-.02em;margin:0}}h2{{font:600 20px/1.2 Poppins;margin:44px 0 14px}}h3{{font:500 15px/1.3 Poppins;margin:0}}
.hand{{font:600 22px/1 Caveat;color:var(--pig)}}
.sub{{color:var(--ink3);font-size:13px;margin-top:6px}}
.hero{{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:end;border-bottom:1px solid var(--hair);padding-bottom:22px}}
.big{{font:600 44px/1 Poppins;font-variant-numeric:tabular-nums}}.big small{{font:400 14px Poppins;color:var(--ink3)}}
table{{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}}td,th{{text-align:left;padding:10px 8px;border-bottom:1px solid var(--hair);vertical-align:top}}th{{font:500 12px/1 Poppins;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3)}}
.bar{{height:6px;background:var(--hair);border-radius:3px;overflow:hidden;min-width:160px}}.bar i{{display:block;height:100%;background:var(--pig)}}
details summary{{cursor:pointer;color:var(--ink2);font-size:13px}}details ul{{margin:8px 0 0;padding-left:18px;color:var(--ink2);font-size:13px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}}
figure{{margin:0;border:1px solid var(--hair);border-radius:3px;overflow:hidden;background:var(--paper)}}figure img{{display:block;width:100%;height:auto}}figcaption{{padding:10px 12px;font-size:13px;color:var(--ink2)}}
.list{{display:grid;gap:8px}}.item{{border:1px solid var(--hair);border-radius:3px;padding:12px 14px;display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start}}
.dot{{width:8px;height:8px;border-radius:50%;background:var(--pig);margin-top:8px}}.dot.wait{{background:var(--ink3)}}
code{{font:12px ui-monospace,Menlo,monospace;color:var(--ink2)}}
.pill{{display:inline-block;font:500 11px/1 Poppins;letter-spacing:.1em;text-transform:uppercase;border:1px solid var(--hair);border-radius:3px;padding:5px 8px;color:var(--ink2);margin-left:8px}}
</style></head><body><div class="wrap">
<div class="hero"><div><div class="hand">Hey Wobo</div><h1>Build progress</h1><div class="sub">Updated {now} · branch the-life · {html.escape(head)}</div></div>
<div><div class="big">{total_done}<small> / {total} tasks</small></div><div class="sub">{int(round(100*total_done/max(1,total)))}% of the written task list</div></div></div>
""")

H.append("<h2>Running now</h2><div class='list'>")
for r in running: H.append(f"<div class='item'><div class='dot'></div><div><h3>{html.escape(r['title'])}</h3><div class='sub'>{html.escape(r.get('detail',''))}</div></div></div>")
if not running: H.append("<div class='sub'>Nothing running.</div>")
H.append("</div>")

H.append("<h2>Waves</h2><table><tr><th>Wave</th><th>Done</th><th>Open</th><th style='width:26%'>Progress</th><th>Open items</th></tr>")
for w in waves:
    items = "".join(f"<li>{html.escape(i)}</li>" for i in w["open_items"][:40])
    more = f"<li>… and {len(w['open_items'])-40} more</li>" if len(w["open_items"]) > 40 else ""
    det = f"<details><summary>{w['open']} open</summary><ul>{items}{more}</ul></details>" if w["open"] else "<span class='sub'>none</span>"
    H.append(f"<tr><td>{html.escape(w['title'])}</td><td>{w['done']}</td><td>{w['open']}</td><td><div class='bar'><i style='width:{pct(w)}%'></i></div><div class='sub'>{pct(w)}%</div></td><td>{det}</td></tr>")
H.append("</table>")

H.append("<h2>Landed in the last 36 hours</h2><table><tr><th>Commit</th><th>What</th></tr>")
for h_, s_ in recent: H.append(f"<tr><td><code>{html.escape(h_)}</code></td><td>{html.escape(s_)}</td></tr>")
H.append("</table>")

for g, items in groups.items():
    H.append(f"<h2>{html.escape(g)}</h2><div class='grid'>")
    for it in items: H.append(f"<figure><img src='{it['file']}' loading='lazy' alt='{html.escape(it['caption'])}'><figcaption>{html.escape(it['caption'])}</figcaption></figure>")
    H.append("</div>")

H.append("<h2>Waiting on you</h2><div class='list'>")
for w in waiting: H.append(f"<div class='item'><div class='dot wait'></div><div><h3>{html.escape(w['title'])}</h3><div class='sub'>{html.escape(w.get('detail',''))}</div></div></div>")
H.append("</div></div></body></html>")
open(os.path.join(OUT, "index.html"), "w").write("\n".join(H))
print(f"progress board: {OUT}/index.html · {total_done}/{total} tasks · {len(gallery)} images · {len(recent)} commits")
