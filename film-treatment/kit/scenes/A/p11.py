import sys, time, numpy as np
from scene import *
from knot import *
from objects import *
t0=time.time()
S=float(sys.argv[1]) if len(sys.argv)>1 else 1.0
W,H=int(1280*S),int(720*S)
pose={'lShoulder':[-6,0,12],'rShoulder':[-6,0,-12],'lElbow':[-14,0,0],'rElbow':[-14,0,0],'chest':[8,0,0],'head':[18,0,0],
      'lHip':[-2,0,3],'rHip':[1,0,-3]}
spec={'camera':{'fov':21,'pos':[0,1.2,10.5],'target':[0,1.02,0],'near':4,'far':20},'figures':[fig('stand',pose,rot=(0,-8,0))]}
ex=extract('p11' if S==1 else 'p11big',spec,W,H)
fd=FigureDrawing(ex,0)
m=fd.main; top=m[:,1].min(); gy=m[:,1].max(); hf=gy-top; cx=(m[:,0].min()+m[:,0].max())/2
print('fig',cx,top,gy,hf)
C=Canvas(W,H,ss=2,seed=111)
ctr=(cx,top+hf*0.44)
objs=[]  # (anchor point, lines)
def add_obj(lines,anchor):
    objs.append((np.array(anchor,float)*S,[np.asarray(P,float)*S for P in lines]))
add_obj(star_rating(185,108,13),(250,125))
L,wb=window(1105,150,50); add_obj(L,(1060,190))
add_obj(zigzag_feed(870,-20,150,26,12),(880,150))
add_obj(globe(1150,420,48),(1105,430))
add_obj(wrapper(1020,615,44),(980,600))
add_obj(chair(215,560,58),(260,520))
add_obj(bed(140,330,48),(230,320))
# lit window at night: a small warm-white light inside the pane
yy,xx=np.mgrid[0:H,0:W]
x0,y0,ww,hh=[v*S for v in wb]
C.fill(((xx>x0)&(xx<x0+ww)&(yy>y0)&(yy<y0+hh)).astype(np.float32),strength=0.10)
threads=[]
NR=fib_normals(7,seed=0.7)
for k,(anchor,lines) in enumerate(objs):
    wraps=[4.6,5.1,4.3,4.9,4.7,4.4,5.0][k]
    sc=1+0.06*np.sin(k*2.1)
    ax=(hf*0.33*sc,hf*0.49*sc,hf*0.33*sc)
    xy,z,t=thread2(anchor,ctr,ax,wraps,NR[k],prec=0.95+0.15*np.cos(k),phase=k*0.9,approach_bend=0.16*(-1)**k)
    threads.append((xy,z,t))
fronts=[]
for xy,z,t in threads:
    for pidx,f in front_back_runs(xy,z):
        if f: fronts.append(xy[pidx])
gm=line_mask(fronts,W,H,4.2*S)
draw_figure(C,fd,seed=3,gaps=gm)
fmask=fig_mask(ex,0,W,H,dilate=2.5*S)
for k,(xy,z,t) in enumerate(threads):
    for j,(pidx,f) in enumerate(front_back_runs(xy,z)):
        P=xy[pidx]
        if f:
            C.add(pen(P,wmin=1.5*S,wmax=2.5*S,seed=k*50+j,temp=1.0,taper_in=0,taper_out=0,k0=1/60,wobble=0.3))
        else:
            for Q in hide(P,fmask):
                C.add(pen(Q,wmin=1.0*S,wmax=1.5*S,seed=k*50+j,temp=1.0,dens=0.42,taper_in=0,taper_out=0,k0=1/60,wobble=0.3))
    # open end: a short taper (no closure)
for k,(anchor,lines) in enumerate(objs):
    for j,P in enumerate(lines):
        C.add(pen(jitter(P,0.5*S,50,k*9+j),wmin=1.5*S,wmax=2.4*S,seed=500+k*9+j,taper_in=3,taper_out=3,k0=1/10))
C.render(f'{OUT}/p11.png' if S==1 else f'{WORK}/p11_big.png',light=(ctr[0],ctr[1],hf*1.1,0.5),vignette=0.6,glow=0.9)
print('done',time.time()-t0)
