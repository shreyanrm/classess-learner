import re,sys
t=open('txt/%s.txt'%sys.argv[1],encoding='utf-8').read()
pages=re.split(r'\f\[page (\d+)\]\n',t)[1:]
hit=False
for i in range(0,len(pages),2):
    n,body=pages[i],pages[i+1]
    if re.search(r'(?i)\bcontents\b',body) and re.search(r'\d',body):
        print('--- page',n); print(body); hit=True
if not hit:
    print('NO CONTENTS PAGE; total pages', len(pages)//2)
