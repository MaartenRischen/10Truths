import sys, time, numpy as np
from scene import *
from world import *
t0=time.time()
S=float(sys.argv[1]) if len(sys.argv)>1 else 1.0
W,H=int(1280*S),int(720*S)
rng=np.random.RandomState(8)
spec={'camera':{'fov':22,'pos':[0,1.28,15],'target':[0,1.28,0],'near':5,'far':30},
      'figures':[fig('standTall',{'lShoulder':[-4,0,7],'rShoulder':[3,0,-7],'lElbow':[-10,0,0],'rElbow':[-8,0,0],
                                   'head':[-6,10,0],'chest':[-2,6,0],'lHip':[-2,0,3],'rHip':[1,0,-4],'rKnee':[4,0,0]},
                     rot=(0,22,0))]}
ex=extract('p08' if S==1 else 'p08big',spec,W,H)
fd=FigureDrawing(ex,0)
m=fd.main
cx=(m[:,0].min()+m[:,0].max())/2; top=m[:,1].min(); gy=m[:,1].max(); hf=gy-top
print('fig',cx,top,gy,hf)
C=Canvas(W,H,ss=2,seed=81)
hor=gy-0.30*hf     # horizon behind the figure (knee height)
# halo: an ellipse of clear paper around the figure
yy,xx=np.mgrid[0:H,0:W]
halo=((xx-cx)/(hf*0.42))**2+((yy-(top+hf*0.48))/(hf*0.72))**2<1
from scipy import ndimage as ndi
core=halo|fig_mask(ex,0,W,H,dilate=10)
dist=ndi.distance_transform_edt(~core)
fade=np.clip(dist/(34*S),0,1); fade=fade*fade*(3-2*fade)
occ=Occluder(W,H,base=core)
def ink(polys,wmin=1.0,wmax=1.5,dens=0.8,seed=0,region=None):
    for i,Q in enumerate(occ.lines(polys,region)):
        if len(Q)<3: continue
        d=dens(Q) if callable(dens) else np.full(len(Q),dens)
        xi=np.clip(Q[:,0].astype(int),0,W-1); yi=np.clip(Q[:,1].astype(int),0,H-1)
        d=d*fade[yi,xi]
        if d.max()<0.03: continue
        C.add(pen(Q,wmin=wmin*S,wmax=wmax*S,seed=seed*131+i,taper_in=3*S,taper_out=3*S,dens=d,k0=1/20,wobble=0.25))
far=lambda Q: np.clip(0.35+0.65*np.abs(Q[:,0]-cx)/(W*0.5),0,1)
# ---- 1 ploughed fields in perspective (a patchwork), a path leading to the figure
tl_y=H-34*S
Z0=10.0; hc=1.0; f=(gy-hor)*Z0/hc
def G(X,Z): return np.stack([cx+f*np.asarray(X)/np.asarray(Z), hor+f*hc/np.asarray(Z)],-1)
Zmin=f*hc/(tl_y-16*S-hor)
hfade=lambda Q: np.clip((Q[:,1]-hor)/(70*S),0,1)**1.5
rngf=np.random.RandomState(21)
fur=[]
Zrows=[Zmin,Z0*1.05,Z0*1.55,Z0*2.6]
for j in range(len(Zrows)-1):
    z0,z1=Zrows[j],Zrows[j+1]
    for side in (-1,1):
        xs=[0.9]
        while xs[-1]<40: xs.append(xs[-1]*rngf.uniform(1.8,2.6)+rngf.uniform(0.8,2.0))
        for i in range(len(xs)-1):
            x0,x1=xs[i]*side,xs[i+1]*side
            x0,x1=min(x0,x1),max(x0,x1)
            horiz=(i+j+(side>0))%2==0
            curv=rngf.uniform(-0.6,0.6)
            sp=rngf.uniform(0.45,0.7)*(1.0 if abs(x0)<8 else 1.25)
            if horiz:
                n=int(np.clip((z1-z0)/(sp*1.9),2,12))
                for Z in np.linspace(z0,z1,n+2)[1:-1]:
                    X=np.linspace(x0,x1,40); ZZ=Z+curv*np.sin((X-x0)/(x1-x0+1e-6)*np.pi)*0.6
                    fur.append(G(X,ZZ))
            else:
                for X in np.arange(x0+sp/2,x1,sp):
                    ZZ=np.geomspace(z0,z1,40); XX=X+curv*np.sin((ZZ-z0)/(z1-z0)*np.pi)*0.5
                    fur.append(G(XX,ZZ))
            fur.append(G(np.array([x0,x1]),np.array([z0,z0])))
# far fields: a few faint hedgerows
for X in [-30,-14,-6,-2.5,2.5,6,14,30]:
    fur.append(G(np.full(40,X),np.geomspace(Z0*2.6,Z0*40,40)))
for Z in [Z0*4,Z0*7,Z0*13]:
    fur.append(G(np.linspace(-60,60,80),np.full(80,Z)))
fur=[jitter(resample(P,1.5)[0],0.7*S,45,k) for k,P in enumerate(fur) if len(P)>1]
ink(fur,0.8,1.25,dens=lambda Q: (0.25+0.4*far(Q))*hfade(Q),seed=1)
# path edges leading to the feet
for X in (-0.9,0.9):
    ink([G(np.full(60,X),np.geomspace(Zmin,Z0*60,60))],1.0,1.4,dens=0.5,seed=11)
# ---- 2 walls along the horizon
wallh=16*S
wl=[]
for side in (-1,1):
    x0,x1=(0,cx-hf*0.3) if side<0 else (cx+hf*0.3,W)
    wl.append(seg((x0,hor),(x1,hor))); wl.append(seg((x0,hor-wallh),(x1,hor-wallh)))
    for r_ in range(2):
        yb=hor-wallh*(r_+0.5)
        wl.append(seg((x0,yb),(x1,yb)))
        for xx_ in np.arange(x0+(r_*9*S),x1,18*S):
            wl.append(seg((xx_,yb),(xx_,yb-wallh*0.5)))
    # crenellations
    xs_=np.arange(x0,x1,22*S)
    cr=[]
    for xx_ in xs_:
        cr+= [(xx_,hor-wallh),(xx_,hor-wallh-7*S),(xx_+11*S,hor-wallh-7*S),(xx_+11*S,hor-wallh)]
    wl.append(np.array(cr))
ink(wl,1.0,1.4,dens=lambda Q: 0.45+0.4*far(Q),seed=2,region=[rect(0,hor-wallh-7*S,W,hor)])
# ---- 3 screens in front of towers
scr=[]
for (sx,sy,sw,sh) in [(0.07,0.44,0.12,0.09),(0.8,0.40,0.14,0.1),(0.2,0.3,0.09,0.07),(0.7,0.26,0.1,0.075),(0.03,0.18,0.08,0.06),(0.9,0.12,0.08,0.06)]:
    L,R=screen(rng,sx*W,sy*H,sw*W,sh*H)
    ink(L,1.1,1.6,dens=0.85,seed=3,region=R)
# ---- 4 skyline: towers taller and denser toward the edges
towers=[]
for side in (-1,1):
    x=cx+side*hf*0.33
    while 0<x<W:
        d=abs(x-cx)/(W*0.5)
        w=rng.uniform(22,46)*S*(1-0.35*d)
        h=(40+rng.uniform(0.6,1.0)*(hf*1.9)*d**1.25)*S**0
        xx_=x if side>0 else x-w
        towers.append((xx_,w,h,d))
        x+=side*w*rng.uniform(0.75,1.05)
towers.sort(key=lambda t:-t[2])  # tall ones behind: draw front (short) first
towers=sorted(towers,key=lambda t:t[2])
for i,(x,w,h,d) in enumerate(towers):
    L,R=tower(rng,x,hor-wallh,w,h,detail=1+d)
    ink(L,0.8,1.3,dens=0.3+0.5*d,seed=40+i,region=R)
# ---- 5 lattice in the sky (neural net), densest at the upper edges
pts,edges=lattice(rng,int(260*S**0),(0,0,W,hor-hf*0.9),lambda p: 0.15+0.85*(abs(p[0]-cx)/(W*0.5))**1.2*(1-p[1]/H))
lat=[seg(pts[i],pts[j]) for i,j in edges]
ink(lat,0.6,0.9,dens=lambda Q: 0.16+0.36*far(Q),seed=5)
nodes=[circle(p[0],p[1],2.2*S) for p in pts]
ink(nodes,0.8,1.0,dens=0.55,seed=6)
print('world',time.time()-t0)
# ---- the figure: untouched, same stroke as the opening
draw_figure(C,fd,seed=5)
# ---- timeline: 2,000,000 years ... and a tiny tick at the very end
x0,x1=70*S,W-70*S
C.add(pen(seg((x0,tl_y),(x1,tl_y)),wmin=1.6*S,wmax=1.9*S,seed=900,taper_in=6,taper_out=0))
tx=x1-(x1-x0)*0.005
C.add(pen(seg((tx,tl_y-7*S),(tx,tl_y+7*S)),wmin=1.8*S,wmax=2.0*S,seed=901,taper_in=0,taper_out=0))
C.render(f'{OUT}/p08.png' if S==1 else f'{WORK}/p08_big.png',light=(cx,top+hf*0.5,hf*0.9,0.5),vignette=0.55)
print('done',time.time()-t0)
