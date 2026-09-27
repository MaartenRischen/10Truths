import sys, time, pickle, numpy as np
from scene import *
from ink import Stroke
t0=time.time()
S=float(sys.argv[1]) if len(sys.argv)>1 else 1.0
W,H=int(1280*S),int(720*S)
C=Canvas(W,H,ss=2,seed=161)
sc=0.176*S
mw,mh=1280*sc,720*sc
gapx=10*S
cols=[W*0.5+(i-2)*(mw+gapx) for i in range(5)]
rows=[H*0.135,H*0.345,H*0.555]
ground={1:0.72,2:0.93,3:0.83,4:0.93,5:0.84,6:0.62,7:0.595,8:0.95,9:0.77,10:0.68,11:0.8,12:0.72,13:0.83,14:0.8,15:0.84}
order=[]
for r in range(3):
    idx=list(range(r*5+1,r*5+6))
    xs=cols if r%2==0 else cols[::-1]
    for k,i in enumerate(idx): order.append((i,xs[k],rows[r],r))
wscale=sc**0.55
def island(P,cx,cy):
    dx=(P[:,0]-cx)/(mw*0.5); dy=(P[:,1]-cy)/(mh*0.5)
    d=np.sqrt(dx**2*0.9+dy**2*0.55)
    return np.clip((1.02-d)/0.22,0,1)**1.5
def place(i,cx,cy):
    rec=pickle.load(open(f'{WORK}/rec/p{i:02d}.pkl','rb'))
    x0=cx-mw/2; y0=cy-mh/2
    k=mw/rec['W']
    for (P,w,tp,dn,kind) in rec['strokes']:
        Q=np.stack([x0+P[:,0]*k,y0+P[:,1]*k],1)
        f=island(Q,cx,cy)
        if f.max()<0.02: continue
        C.add(Stroke(Q,np.maximum(w*wscale,0.55*S),temp=tp,dens=dn*0.72*f,kind=kind))
    for (P,r,tp,dn) in rec['dots']:
        Q=np.stack([x0+P[:,0]*k,y0+P[:,1]*k],1)
        f=island(Q,cx,cy)
        C._stamp(Q*C.ss,np.maximum(r*k,0.25)*C.ss,tp,dn*0.6*f,np.ones(len(r),np.uint8),_rec=False)
for (i,cx,cy,r) in order:
    place(i,cx,cy)
print('minis',time.time()-t0)
# one continuous line: it runs along each scene's own ground, turning in cursive loops at the row ends
pts=[]
for n,(i,cx,cy,r) in enumerate(order):
    gy=cy-mh/2+mh*ground[i]+1.5*S
    d=1 if r%2==0 else -1
    a_=(cx-d*mw*0.40,gy); b_=(cx+d*mw*0.40,gy)
    if n==0: pts.append((a_[0]-70*S,gy))
    pts+= [a_,b_]
    if n in (4,9):
        # cursive turn to the next row, inside the frame
        nxt=order[n+1]; gy2=nxt[2]-mh/2+mh*ground[nxt[0]]+1.5*S
        ex_=b_[0]+d*28*S
        pts+= [(ex_,gy-4*S),(ex_+d*16*S,(gy+gy2)/2-20*S),(ex_-d*6*S,(gy+gy2)/2),(ex_,gy2)]
size=74*S
txt='demismatch.com'
tw=text_width(txt,size)
tx=W/2-tw/2; ty=H*0.885
polys,_=handwrite(txt,tx,ty,size)
first=polys[0][0]
under=ty+22*S
lastp=pts[-1]
pts+=[(lastp[0]+30*S,lastp[1]+40*S),(W*0.66,under+4*S),(tx+tw*0.2,under+10*S),(tx-40*S,under),(tx-46*S,ty-size*0.35),first]
path=spline(np.array(pts),n_per=48,tension=0.5)
s_=arclen(path); L=s_[-1]
dens=np.interp(s_,[0,L*0.8,L],[0.75,0.8,1.0])
C.add(pen(path,wmin=1.3*S,wmax=2.4*S,seed=3,taper_in=40*S,taper_out=0,k0=1/40,wobble=0.35,dens=dens))
# the writing: letters joined by the line in one stroke
for j,(Pp,role) in enumerate(chain(polys)):
    if role=='travel':
        C.add(pen(Pp,wmin=0.8*S,wmax=1.0*S,seed=100+j,dens=0.3,taper_in=0,taper_out=0))
    else:
        if arclen(Pp)[-1]<5*S:
            c=Pp.mean(0); C.add(pen(circle(c[0],c[1],2.3*S),wmin=3.6*S,wmax=4.0*S,seed=150+j,taper_in=0,taper_out=0)); continue
        C.add(pen(Pp,wmin=1.8*S,wmax=4.0*S,seed=100+j,taper_in=3,taper_out=4,k0=1/6,wobble=0.25))
# lift-off: a short flick up and away, thinning out; the bead has just left the paper
last=polys[-1][-1]
flick=spline([last,last+np.array([14*S,-10*S]),last+np.array([34*S,-34*S])],n_per=24)
s_=arclen(flick)
C.add(pen(flick,wmin=0.3*S,wmax=2.6*S,seed=7,taper_in=0,taper_out=0,press=np.interp(s_,[0,s_[-1]],[1.0,0.08]),k0=1/40))
bx,by=last+np.array([44*S,-46*S])
C.bead(bx,by,3.4*S)
C.render(f'{OUT}/p16.png' if S==1 else f'{WORK}/p16_big.png',light=(W*0.5,H*0.84,W*0.4,0.45),vignette=0.55,glow=0.8)
print('done',time.time()-t0)
