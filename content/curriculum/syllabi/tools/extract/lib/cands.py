import os
import re
import sys
from pathlib import Path

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NUM = re.compile(r"(?:^|\s{2,})(\d{1,2})\.\s+([A-Z][A-Za-z0-9 ,&/'’()\-]{2,55}?)(?=\s{3,}|$)")
CLASS = re.compile(r"^\s*CLASS\s+(XI{0,2}|IX|X)\s*$")
lines = (
    Path(HERE, "lay", sys.argv[1] + ".txt")
    .read_text(encoding="utf-8", errors="replace")
    .split("\n")
)
page, cls, stop = 1, "-", False
for line in lines:
    raw = line.replace("\f", "")
    m = CLASS.match(raw)
    if m:
        cls, stop = m.group(1), False
        print("======== CLASS", cls, "p", page)
    if re.match(
        r"^\s*(INTERNAL ASSESSMENT|LIST OF SUGGESTED|EVALUATION|PRACTICAL WORK|SI\s+UNITS|GUIDELINES FOR)",
        raw,
    ):
        stop = True
    if not stop:
        for mm in NUM.finditer(raw):
            t = mm.group(2).strip().rstrip(".")
            print(f"  p{page:<3} col{mm.start(1):<3} {mm.group(1):>2}. {t}")
    page += line.count("\f")
