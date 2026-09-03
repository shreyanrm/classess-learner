import re
import sys
from pathlib import Path

t = Path(f"txt/{sys.argv[1]}.txt").read_text(encoding="utf-8")
pages = re.split(r"\f\[page (\d+)\]\n", t)[1:]
hit = False
for i in range(0, len(pages), 2):
    n, body = pages[i], pages[i + 1]
    if re.search(r"(?i)\bcontents\b", body) and re.search(r"\d", body):
        print("--- page", n)
        print(body)
        hit = True
if not hit:
    print("NO CONTENTS PAGE; total pages", len(pages) // 2)
