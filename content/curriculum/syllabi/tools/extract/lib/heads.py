import re,sys
t=open('txt/%s.txt'%sys.argv[1],encoding='utf-8').read()
lines=t.split('\n')
page=0
for i,l in enumerate(lines):
    m=re.match(r'\f\[page (\d+)\]',l)
    if m: page=int(m.group(1)); continue
    if re.search(r'No\.?\s*of\s*[Pp]eriods', l):
        ctx=[x.strip() for x in lines[max(0,i-6):i+2] if x.strip()]
        print('p%-3d | %s' % (page,' / '.join(ctx)))
