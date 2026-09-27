import sys, time, numpy as np
from scene import *
from figure import FigureDrawing
t0=time.time()
S=float(sys.argv[1]) if len(sys.argv)>1 else 1.0
W,H=int(1280*S),int(720*S)
rng=np.random.RandomState(12)
def face_center(x,z,jit=0):
    return np.degrees(np.arctan2(-x,-z))+jit
figs=[]; kinds=[]
# the few you would die for: five seated at the fire
fire_poses=[{'lShoulder':[-52,0,12],'rShoulder':[-52,0,-12],'lElbow':[-38,0,0],'rElbow':[-38,0,0]},
            {'chest':[18,0,0],'head':[16,0,0]},
            {'lShoulder':[-30,0,20],'rShoulder':[-70,0,-6],'rElbow':[-40,0,0],'head':[-6,0,0]},
            {'lShoulder':[-50,0,10],'rShoulder':[-50,0,-10]},
            {'chest':[6,-10,0],'head':[4,-20,0]}]
for k in range(5):
    a=2*np.pi*k/5+0.35; R=1.7
    x,z=R*np.sin(a),R*np.cos(a)
    figs.append(fig('sitCrossFire',fire_poses[k],pos=(x,0,z),rot=(0,face_center(x,z),0))); kinds.append('five')
# the band (~50) around and among the huts
band_poses=['stand','walk','carry','kneel','sitHugKnees','reachForward','standTall','walk','sitCrossFire','armsOpen','handToChest']
hut_ang=np.linspace(0,2*np.pi,11,endpoint=False)+0.18
for k in range(47):
    a=rng.uniform(0,2*np.pi); R=rng.uniform(4.2,12.5)
    if np.min(np.abs(((a-hut_ang+np.pi)%(2*np.pi))-np.pi))<0.13 and abs(R-9.0)<1.6: R+=rng.choice([-2.0,2.0])
    x,z=R*np.sin(a),R*np.cos(a)
    p=band_poses[k%len(band_poses)]
    figs.append(fig(p,{},pos=(x,0,z),rot=(0,face_center(x,z,rng.uniform(-100,100)),0))); kinds.append('band')
# the ~150 you knew by name: a wide ring
ring_poses=['stand','walk','standTall','stand','walk','carry','reachForward','armsOpen']
for k in range(150):
    a=2*np.pi*k/150+rng.uniform(-0.01,0.01); R=rng.uniform(20.6,22.6)
    x,z=R*np.sin(a),R*np.cos(a)
    p=ring_poses[rng.randint(len(ring_poses))]
    figs.append(fig(p,{},pos=(x,0,z),rot=(0,face_center(x,z,rng.uniform(-120,120)),0))); kinds.append('ring')
huts=[]
for k,a in enumerate(hut_ang):
    R=9.0; x,z=R*np.sin(a),R*np.cos(a)
    huts.append({'type':'dome','r':1.25,'pos':[x,0,z],'scale':[1,1.0,1]})
cam={'fov':26,'pos':[0,62.5,60.4],'target':[0,0,2.6],'near':20,'far':180}
spec={'camera':cam,'figures':figs,'props':huts}
ex=extract('p06',spec,W,H)
print('extract',time.time()-t0)
C=Canvas(W,H,ss=2,seed=61)
nf=len(figs)
def P3(X): return ex.project(np.atleast_2d(X))[0]
allmask=fig_mask(ex,None,W,H,dilate=2.0)
# fire position & warm light
fp=P3([0,0,0])[0]
C.glows.append((fp[0],fp[1]-10*S,80*S,0.16,(1.0,0.72,0.45)))
C.glows.append((fp[0],fp[1]-8*S,260*S,0.05,(1.0,0.72,0.45)))
# concentric ground rings (tree rings)
def ground_ring(R,wob,seed,n=720):
    th=np.linspace(0,2*np.pi,n,endpoint=False)
    rr=R*(1+wob*fbm1(seed,th*R*12,((40.0,1.0),(12.0,0.3))))
    X=np.stack([rr*np.sin(th),np.zeros_like(th),rr*np.cos(th)],1)
    Q=P3(X); return np.vstack([Q,Q[:1]])
rings=[(3.0,0.4,1.3),(14.0,0.34,1.2),(24.2,0.3,1.2)]
faint=[(1.2,0.1),(4.6,0.1),(6.4,0.08),(11.2,0.1),(16.8,0.08),(19.2,0.07),(26.8,0.08),(29.5,0.05)]
for i,(R,d,w) in enumerate(rings):
    for Q in hide(ground_ring(R,0.012,i+3),allmask):
        C.add(pen(Q,wmin=w*S,wmax=w*1.2*S,seed=200+i,taper_in=10,taper_out=10,dens=d,k0=1/200,wobble=0.35))
for i,(R,d) in enumerate(faint):
    for Q in hide(ground_ring(R,0.02,i+30),allmask):
        C.add(pen(Q,wmin=0.8*S,wmax=1.0*S,seed=230+i,taper_in=10,taper_out=10,dens=d,k0=1/200,wobble=0.35))
# fire: logs + three flame loops
for k in range(4):
    a=k*np.pi/4+0.3
    L=P3([[0.55*np.cos(a),0.04,0.55*np.sin(a)],[-0.55*np.cos(a),0.04,-0.55*np.sin(a)]])
    for Q in hide(seg(L[0],L[1]),allmask):
        C.add(pen(Q,wmin=1.4*S,wmax=1.8*S,seed=300+k,taper_in=3,taper_out=3))
fh=abs(P3([0,1.1,0])[0][1]-fp[1])*2.6
def flame(cx,cy,h,w,lean,seed):
    t=np.linspace(0,1,120)
    # teardrop loop: from base up the left side to a tip, down the right side back to base
    th=t*2*np.pi
    x=w*np.sin(th)*(1-0.55*t*(1-t)*0)*np.sin(th/2)**0.6
    y=-h*np.sin(th/2)**1.4
    x=w*np.sin(th)*0.5*(1+np.cos(th/2))*0.9
    y=-h*(1-np.cos(th/2))/2*np.sin(th/2)**0.3-h*0.0
    X=cx+x+lean*(-y/h)**1.6*h*0.25; Y=cy+y
    return np.stack([X,Y],1)
for k,(dx,hh,ww,lean) in enumerate([(-0.18,0.72,0.26,-0.25),(0.0,1.0,0.3,0.1),(0.2,0.64,0.24,0.3)]):
    F=flame(fp[0]+dx*fh,fp[1],hh*fh,ww*fh,lean,k)
    C.add(pen(F,wmin=1.7*S,wmax=2.8*S,seed=310+k,taper_in=4,taper_out=6,k0=1/10))
print('rings/fire',time.time()-t0)
# huts: trace from label buffer, plus door arches facing the fire
camp=np.array(cam['pos'])
for hi,hut in enumerate(huts):
    fi=nf+hi
    fd=FigureDrawing(ex,fi,joints=False,cons=False,inner=False)
    if not fd.segs: continue
    for s_ in fd.segs:
        C.add(pen(s_['P'],wmin=1.5*S,wmax=2.4*S,seed=400+hi,taper_in=6,taper_out=8,k0=1/30))
    # thatch latitude arcs (front half only)
    x,_,z=hut['pos']
    for j,lat in enumerate([0.35,0.7]):
        th=np.linspace(0,2*np.pi,160)
        r=1.25*np.cos(np.arcsin(lat)); y=1.25*lat
        X=np.stack([x+r*np.sin(th),np.full_like(th,y),z+r*np.cos(th)],1)
        nrm=X-np.array([x,0,z]); vis=((camp-X)*nrm).sum(1)>0
        Q=P3(X)
        f_,p_,d_=ex.label_at(Q)
        vis&=(f_==fi+1)
        idx=np.where(np.diff(np.r_[0,vis.astype(int),0])!=0)[0]
        for a_,b_ in zip(idx[::2],idx[1::2]):
            if b_-a_>4: C.add(pen(Q[a_:b_],wmin=0.9*S,wmax=1.2*S,seed=420+hi*3+j,dens=0.45,taper_in=6,taper_out=6))
    # door facing the fire
    dirc=-np.array([x,0,z])/np.hypot(x,z)
    if ((camp-np.array([x,0.4,z]))*dirc).sum()>0:
        side=np.array([dirc[2],0,-dirc[0]])
        base=np.array([x,0,z])+dirc*1.22
        th=np.linspace(0,np.pi,40)
        arch=[base+side*0.26*np.cos(t)+np.array([0,0.42+0.26*np.sin(t),0]) for t in th]
        door=np.vstack([[base+side*0.26],arch,[base-side*0.26]])
        Q=P3(door)
        for Qv in hide(Q,fig_mask(ex,None,W,H,dilate=1.5)&~(ex.fig[::2,::2]==fi+1)[:H,:W]):
            C.add(pen(Qv,wmin=1.1*S,wmax=1.6*S,seed=450+hi,taper_in=3,taper_out=3))
print('huts',time.time()-t0)
# figures
for fi in range(nf):
    kind=kinds[fi]
    if kind=='five':
        fd=FigureDrawing(ex,fi,joints=False,cons=False,inner=True)
        draw_figure(C,fd,seed=fi,weight=0.68,wobble=0.25)
    elif kind=='band':
        fd=FigureDrawing(ex,fi,joints=False,cons=False,inner=True)
        draw_figure(C,fd,seed=fi,weight=0.46,wobble=0.2)
    else:
        fd=FigureDrawing(ex,fi,joints=False,cons=False,inner=False)
        draw_figure(C,fd,seed=fi,weight=0.4,wobble=0.2,dens=0.62)
print('figs',time.time()-t0)
C.render(f'{OUT}/p06.png' if S==1 else f'{WORK}/p06_big.png',light=(fp[0],fp[1],520*S,0.5),vignette=0.6)
print('done',time.time()-t0)
