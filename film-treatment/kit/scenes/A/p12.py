import sys, time, numpy as np
from scene import *
from knot import *
t0=time.time()
S=float(sys.argv[1]) if len(sys.argv)>1 else 1.0
W,H=int(1280*S),int(720*S)
pose={'lShoulder':[-6,0,12],'rShoulder':[-6,0,-12],'lElbow':[-14,0,0],'rElbow':[-14,0,0],'chest':[8,0,0],'head':[18,0,0],
      'lHip':[-2,0,3],'rHip':[1,0,-3]}
spec={'camera':{'fov':25,'pos':[3.2,1.3,13],'target':[3.2,1.25,0],'near':4,'far':25},'figures':[fig('stand',pose,rot=(0,20,0))]}
ex=extract('p12' if S==1 else 'p12big',spec,W,H)
fd=FigureDrawing(ex,0)
m=fd.main; top=m[:,1].min(); gy=m[:,1].max(); hf=gy-top; cx=(m[:,0].min()+m[:,0].max())/2
print('fig',cx,top,gy,hf)
C=Canvas(W,H,ss=2,seed=121)
ctr=(cx,top+hf*0.45)
# ---- the machine (ruler & compass only)
from machine import machine, rect
anc=machine(C,700*S,gy,s=1.0*S,w=1.5)
sp_c,sp_r,sp_len=anc['spool']
lip=anc['lip']
RW=1.5*S
def R(P,w=RW,dens=1.0): C.add(ruled(P,w=w,dens=dens))
# coins sliding off the chute lip and falling into a pile on the ground
rng=np.random.RandomState(4)
for k,(ox,oy,ang) in enumerate([(-6,16,0.3),(-18,52,1.1),(-12,96,-0.5),(-24,140,0.9)]):
    c=lip+np.array([ox*S,oy*S])
    if c[1]<gy-12*S: R(circle(c[0],c[1],10*S,ry=4*S,rot=ang),w=1.3*S)
pile_c=np.array([lip[0]-6*S,gy])
for k,(col,row) in enumerate([(-2,0),(-1,0),(0,0),(1,0),(2,0),(-1.5,1),(-0.5,1),(0.5,1),(1.5,1),(-1,2),(0,2),(1,2),(-0.5,3),(0.5,3),(0,4)]):
    c=pile_c+np.array([col*19*S+rng.uniform(-2,2)*S,-5*S-row*8*S])
    R(circle(c[0],c[1],10*S,ry=4*S),w=1.3*S)
R(np.array([[640*S,gy+1],[W-24*S,gy+1]]),w=1.3*S,dens=0.8)
C.add(pen(seg((cx-hf*0.6,gy+1),(cx+hf*0.8,gy)),wmin=1.5*S,wmax=1.9*S,seed=8,taper_in=40*S,taper_out=40*S))
# ---- the knot around the figure, its loose ends running taut to the spool
objs_dirs=7
NR=fib_normals(7,seed=0.7)
threads=[]
for k in range(7):
    wraps=4.4+0.3*np.sin(k)
    sc=1+0.06*np.sin(k*2.1)
    ax=(hf*0.33*sc,hf*0.49*sc,hf*0.33*sc)
    target=sp_c+np.array([sp_len*(0.15+0.1*k),(k-3)*4*S])
    Pu=band(int(600*wraps),wraps,NR[k],prec=0.95+0.15*np.cos(k),phase=k*0.9)
    xy,z=project_ellipsoid(Pu,ctr,ax)
    # leave the knot toward the machine from the front point nearest the spool, in the last wrap
    last=int(len(xy)*(1-1/wraps))
    d=np.sqrt(((xy[last:]-target)**2).sum(1))+1e4*(z[last:]<0)
    j=last+int(np.argmin(d))
    xy,z=xy[:j+1],z[:j+1]
    tan=xy[-1]-xy[-5]; tan/=np.linalg.norm(tan)
    dist=np.linalg.norm(target-xy[-1])
    sag=np.array([0,1.0])*dist*0.04*(1+0.3*np.sin(k))
    taut=spline([xy[-1],xy[-1]+tan*40*S,(xy[-1]+target)/2+sag,target],n_per=30,tension=0.5)
    path=join(xy,taut); zz=np.concatenate([z,np.ones(len(path)-len(xy))])
    threads.append((path,zz))
fronts=[]
for xy,z in threads:
    for pidx,f in front_back_runs(xy,z):
        if f: fronts.append(xy[pidx])
gm=line_mask(fronts,W,H,3.6*S)
draw_figure(C,fd,seed=3,gaps=gm)
fmask=fig_mask(ex,0,W,H,dilate=2.0*S)
for k,(xy,z) in enumerate(threads):
    for j,(pidx,f) in enumerate(front_back_runs(xy,z)):
        P=xy[pidx]
        if f: C.add(pen(P,wmin=1.3*S,wmax=2.2*S,seed=k*50+j,temp=1.0,taper_in=0,taper_out=0,k0=1/60,wobble=0.3))
        else:
            for Q in hide(P,fmask): C.add(pen(Q,wmin=0.9*S,wmax=1.3*S,seed=k*50+j,temp=1.0,dens=0.42,taper_in=0,taper_out=0,k0=1/60,wobble=0.3))
# thread wound on the spool (ember turns)
for k in range(9):
    x=sp_c[0]+sp_len*(0.12+0.085*k)
    C.add(pen(circle(x,sp_c[1],sp_r*0.33,ry=sp_r*0.96,th0=-np.pi/2,sweep=np.pi),wmin=1.3*S,wmax=1.8*S,temp=1.0,seed=700+k,taper_in=0,taper_out=0,k0=1/40))
C.render(f'{OUT}/p12.png' if S==1 else f'{WORK}/p12_big.png',light=(W*0.5,H*0.5,W*0.5,0.4),vignette=0.6,glow=0.9)
print('done',time.time()-t0)
