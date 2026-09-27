import re, html
from PIL import Image, ImageDraw
D='fonts/package/svg_fonts/'
def load(fn):
    s=open(D+fn).read()
    g={}
    for m in re.finditer(r'<glyph([^>]*)/>', s):
        a=m.group(1)
        u=re.search(r'unicode="([^"]*)"',a); 
        if not u: continue
        ch=html.unescape(u.group(1))
        adv=re.search(r'horiz-adv-x="([^"]*)"',a)
        d=re.search(r' d="([^"]*)"',a)
        g[ch]=(float(adv.group(1)) if adv else 378, d.group(1) if d else '')
    return g
def strokes(d):
    toks=re.findall(r'[MLCQZmlcqz]|-?[\d.]+(?:e-?\d+)?',d)
    out=[];cur=[];i=0;cmd=None
    while i<len(toks):
        t=toks[i]
        if t in 'MLCQZmlcqz': cmd=t;i+=1
        if cmd=='M':
            if cur: out.append(cur)
            cur=[(float(toks[i]),float(toks[i+1]))];i+=2;cmd='L'
        elif cmd=='L':
            cur.append((float(toks[i]),float(toks[i+1])));i+=2
        elif cmd=='C':
            p0=cur[-1];p1=(float(toks[i]),float(toks[i+1]));p2=(float(toks[i+2]),float(toks[i+3]));p3=(float(toks[i+4]),float(toks[i+5]));i+=6
            for k in range(1,9):
                t=k/8;mt=1-t
                cur.append((mt**3*p0[0]+3*mt*mt*t*p1[0]+3*mt*t*t*p2[0]+t**3*p3[0], mt**3*p0[1]+3*mt*mt*t*p1[1]+3*mt*t*t*p2[1]+t**3*p3[1]))
        else: i+=1
    if cur: out.append(cur)
    return out
fonts=['EMSAllure.svg','EMSElfin.svg','EMSFelix.svg','HersheyScript1.svg','HersheyScriptMed.svg','EMSReadabilityItalic.svg','EMSNixishItalic.svg','EMSNixish.svg']
img=Image.new('L',(1400,130*len(fonts)),0);dr=ImageDraw.Draw(img)
for fi,f in enumerate(fonts):
    g=load(f);x=20;y0=100+fi*130;sc=0.09
    for text in ['You are not broken.   demismatch.com']:
        for ch in text:
            adv,d=g.get(ch,(300,''))
            for st in strokes(d):
                pts=[(x+px*sc,y0-py*sc) for px,py in st]
                if len(pts)>1: dr.line(pts,fill=255,width=2)
            x+=adv*sc
    dr.text((1250,y0-40),f[:12],fill=128)
img.save('work/fontsample.png')
