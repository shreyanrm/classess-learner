import re, sys, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NUM = re.compile(r"(?:^|\s{2,})(\d{1,2})\.\s+([A-Z][A-Za-z0-9 ,&/'’()\-]{2,55}?)(?=\s{3,}|$)")
CLASS = re.compile(r"^\s*CLASS\s+(XI{0,2}|IX|X)\s*$")
lines = open(os.path.join(HERE, "lay", sys.argv[1] + ".txt"), encoding="utf-8", errors="replace").read().split("\n")
page, cls, stop = 1, "-", False
for l in lines:
    raw = l.replace("\f", "")
    m = CLASS.match(raw)
    if m:
        cls, stop = m.group(1), False
        print("======== CLASS", cls, "p", page)
    if re.match(r"^\s*(INTERNAL ASSESSMENT|LIST OF SUGGESTED|EVALUATION|PRACTICAL WORK|SI\s+UNITS|GUIDELINES FOR)", raw):
        stop = True
    if not stop:
        for mm in NUM.finditer(raw):
            t = mm.group(2).strip().rstrip(".")
            print("  p%-3s col%-3d %2s. %s" % (page, mm.start(1), mm.group(1), t))
    page += l.count("\f")
