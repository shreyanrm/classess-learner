import re
import sys
from pathlib import Path

t = Path(f"txt/{sys.argv[1]}.txt").read_text(encoding="utf-8")
lines = t.split("\n")
page = 0
for i, line in enumerate(lines):
    m = re.match(r"\f\[page (\d+)\]", line)
    if m:
        page = int(m.group(1))
        continue
    if re.search(r"No\.?\s*of\s*[Pp]eriods", line):
        ctx = [x.strip() for x in lines[max(0, i - 6) : i + 2] if x.strip()]
        print(f"p{page:<3} | {' / '.join(ctx)}")
