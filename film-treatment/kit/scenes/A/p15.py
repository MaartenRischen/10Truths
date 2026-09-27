import sys, time, numpy as np
from scene import *
from geo3d import *
t0=time.time()
S=float(sys.argv[1]) if len(sys.argv)>1 else 1.0
W,H=int(1280*S),int(720*S)
rng=np.random.RandomState(15)
solids=[]
TZ=2.4   # table z
solids.append(box(-3.0,3.0,0.72,0.8,TZ-0.5,TZ+0.5))
for x in (-2.7,2.7):
    for dz in (-0.35,0.35): solids.append(box(x-0.05,x+0.05,0,0.72,TZ+dz-0.05,TZ+dz+0.05))
for zc in (TZ-1.05,TZ+1.05):
    solids.append(box(-2.9,2.9,0.44,0.5,zc-0.17,zc+0.17))
    for x in (-2.6,2.6): solids.append(box(x-0.04,x+0.04,0,0.44,zc-0.04,zc+0.04))
# back row with a gap for the street and tram
for i,(x0,x1,h) in enumerate([(-15.8,-11.4,4.6),(-11.2,-6.8,6.2),(-6.6,-3.4,4.6),(3.6,7.2,4.6),(7.4,11.8,6.2),(12.0,16.4,4.6)]):
    solids.append(house(x0,x1,-9.0,-6.4,h,1.8,door_side=1))
# side blocks around the courtyard
for zc,h in [(-3.2,4.6),(1.4,6.2)]:
    s_=house(-2.2,2.2,-1.5,1.5,h,1.8,door_side=1); rot_y(s_,np.pi/2); translate(s_,(-10.2,0,zc)); solids.append(s_)
for zc,h in [(-3.2,6.2),(1.4,4.6)]:
    s_=house(-2.2,2.2,-1.5,1.5,h,1.8,door_side=1); rot_y(s_,-np.pi/2); translate(s_,(10.6,0,zc)); solids.append(s_)
# tram crossing the gap on the street behind (side-on, rounded ends, pantograph)
tz0,tz1=-13.2,-11.0
tram=box(-5.2,4.4,0.4,3.0,tz0,tz1,edges=False)
fz=tz1+0.01
def rounded_side(x0,x1,y0,y1,r):
    pts=[]
    for (cx,cy,a0) in [(x1-r,y1-r,0),(x0+r,y1-r,np.pi/2)]:
        th=a0+np.linspace(0,np.pi/2,10); pts+=[[cx+r*np.cos(t),cy+r*np.sin(t),fz] for t in th]
    pts+=[[x0,y0,fz],[x1,y0,fz],[x1,y1-r,fz]]
    return np.array(pts)
tram.edges.append(rounded_side(-5.2,4.4,0.4,3.0,0.9))
for k in range(6):
    x=-4.3+k*1.45
    tram.edges.append(np.array([[x,1.45,fz],[x,2.45,fz],[x+1.0,2.45,fz],[x+1.0,1.45,fz],[x,1.45,fz]]))
tram.edges.append(np.array([[-5.15,0.95,fz],[4.35,0.95,fz]]))
for x in (-3.6,-2.4,2.2,3.4):
    th=np.linspace(0,2*np.pi,24); tram.edges.append(np.stack([x+0.32*np.cos(th),0.42+0.32*np.sin(th),np.full(24,fz)],1))
tram.edges.append(np.array([[-0.6,3.0,-12.1],[0.1,3.9,-12.1],[0.7,4.75,-12.1],[-0.2,4.75,-12.1]]))
solids.append(tram)
wire=[np.array([[-60,4.75,-12.1],[60,4.75,-12.1]])]
for x in (-9.0,8.0):
    wire.append(np.array([[x,0,-13.9],[x,5.3,-13.9],[x,4.75,-12.1]]))
props=[s_.prop() for s_ in solids]
# trees (occluders): trunk + canopy sphere
trees=[(-7.0,-2.4,3.3,1.9),(7.6,-3.2,3.1,1.8)]
for (x,z,h,r) in trees:
    props.append({'type':'cyl','r':0.16,'r2':0.2,'hgt':h,'pos':[x,h/2,z]})
    props.append({'type':'sphere','r':r,'pos':[x,h+r*0.7,z]})
# figures
sitA={'lHip':[-86,0,5],'rHip':[-86,0,-5],'lKnee':[88,0,0],'rKnee':[88,0,0],'chest':[6,0,0],'lShoulder':[-40,0,8],'rShoulder':[-40,0,-8],'lElbow':[-50,0,0],'rElbow':[-50,0,0]}
figs=[]
for k,x in enumerate([-2.2,-0.75,0.7,2.15]):
    ov=dict(sitA); ov['head']=[rng.uniform(-5,8),rng.uniform(-30,30),0]; ov['chest']=[4,rng.uniform(-18,18),0]
    if k==1: ov['rShoulder']=[-85,0,-25]; ov['rElbow']=[-40,0,0]
    if k==2: ov['head']=[-4,-35,0]
    figs.append(fig('stand',ov,pos=(x,0,TZ-1.25),rot=(0,0,0)))
for k,x in enumerate([-1.5,0.0,1.5]):
    ov=dict(sitA); ov['head']=[0,rng.uniform(-35,35),0]
    figs.append(fig('stand',ov,pos=(x,0,TZ+1.25),rot=(0,180,0)))
figs.append(fig('walk',{'lShoulder':[-60,0,10],'lElbow':[-60,0,0],'rShoulder':[-60,0,-10],'rElbow':[-60,0,0]},pos=(4.8,0,3.4),rot=(0,-105,0)))
figs.append(fig('walk',{},pos=(-1.2,0,-7.6),rot=(0,150,0)))
figs.append({'pose':'walk','overrides':{'lShoulder':[-40,0,30],'rShoulder':[30,0,-30]},'root':{'pos':[-4.3,0,4.6],'rot':[0,70,0]},'ground':0,'scale':0.62})
cam={'fov':40,'pos':[-0.6,6.4,17.5],'target':[0.2,2.6,-2.0],'near':3,'far':150}
spec={'camera':cam,'figures':figs,'props':props}
ex=extract('p15' if S==1 else 'p15big',spec,W,H)
print('extract',time.time()-t0)
C=Canvas(W,H,ss=2,seed=151)
def P3(X): return ex.project(np.atleast_2d(np.asarray(X,float)))[0]
nf=len(figs)
def draw3(poly3,w=(1.4,2.2),dens=1.0,seed=0,taper=4):
    for R in visible_polyline(ex,poly3):
        C.add(pen(R,wmin=w[0]*S,wmax=w[1]*S,seed=seed,dens=dens,taper_in=taper,taper_out=taper,k0=1/30,wobble=0.35))
# the horizon (continuing from the pull), hidden behind the new world
draw3(np.array([[-400,0,-160],[400,0,-160]]),w=(1.8,2.2),seed=1,taper=0)
for i,s_ in enumerate(solids):
    for j,e in enumerate(s_.edges):
        draw3(e,seed=i*37+j,dens=0.9)
for j,e in enumerate(wire):
    for R in visible_polyline(ex,e): C.add(pen(R,wmin=1.0*S,wmax=1.3*S,seed=900+j,dens=0.8,taper_in=4,taper_out=4))
# trees: trunk lines + a canopy drawn as a chain of cursive loops around the crown
for k,(x,z,h,r) in enumerate(trees):
    fi_trunk=nf+len(solids)+2*k; fi_crown=fi_trunk+1
    fdT=FigureDrawing(ex,fi_trunk,joints=False,cons=False,inner=False)
    for sg in fdT.segs: C.add(pen(sg['P'],wmin=1.3*S,wmax=1.9*S,seed=300+k,taper_in=4,taper_out=4))
    c3=np.array([x,h+r*0.7,z]); cc=P3(c3)[0]; rp=np.linalg.norm(P3(c3)[0]-P3(c3+[r,0,0])[0])
    rr_=np.random.RandomState(40+k)
    n=2200; t=np.linspace(0,1,n)
    # a wandering scribble of loops that fills an irregular crown (like a quick ink tree)
    base_ang=t*2*np.pi*1.6+k
    wob=1+0.12*np.sin(3*base_ang+rr_.uniform(0,6))+0.08*np.sin(5*base_ang+rr_.uniform(0,6))
    R_=rp*(0.55+0.3*np.abs(np.sin(t*np.pi*2.2+k)))*wob
    lr=rp*(0.16+0.09*np.sin(t*np.pi*13+k))
    ph=np.cumsum(np.full(n,2*np.pi*17/n))
    X=cc[0]+R_*np.cos(base_ang)+lr*np.cos(ph)
    Y=cc[1]+R_*np.sin(base_ang)*0.86+lr*np.sin(ph)*1.05
    can=np.stack([X,Y],1)
    occ=np.zeros((H,W),bool)
    for fi in range(nf): occ|=fig_mask(ex,fi,W,H,dilate=2)
    for Q in hide(can,occ):
        C.add(pen(Q,wmin=1.3*S,wmax=2.2*S,seed=310+k,taper_in=6,taper_out=6,k0=1/8))
# the screen on the right block: a friend's face and an arrow to the door
sx=8.35; sy=1.3; sz=0.9
corners=np.array([[sx,sy,sz-0.85],[sx,sy,sz+0.85],[sx,sy+1.25,sz+0.85],[sx,sy+1.25,sz-0.85],[sx,sy,sz-0.85]])
for R in visible_polyline(ex,corners,eps=0.2): C.add(pen(R,wmin=1.6*S,wmax=2.2*S,seed=400,taper_in=0,taper_out=0))
fc=P3([sx,sy+0.68,sz+0.2])[0]; fr=np.linalg.norm(P3([sx,sy+0.68,sz])[0]-P3([sx,sy+1.05,sz])[0])
C.add(pen(circle(fc[0],fc[1],fr*0.5,ry=fr*0.7),wmin=1.2*S,wmax=1.6*S,seed=401,taper_in=0,taper_out=0))
C.add(pen(seg(fc+[fr*0.12,-fr*0.7],fc+[fr*0.12,fr*0.7]),wmin=0.9*S,wmax=1.1*S,seed=402,dens=0.7))
a0=P3([sx,sy+0.3,sz-0.3])[0]; a1=P3([sx,sy+0.3,sz-1.45])[0]
C.add(pen(seg(a0,a1),wmin=1.3*S,wmax=1.6*S,seed=404))
dv=(a1-a0)/np.linalg.norm(a1-a0); nv=np.array([-dv[1],dv[0]])
C.add(pen(np.array([a1-dv*7*S+nv*5*S,a1,a1-dv*7*S-nv*5*S]),wmin=1.3*S,wmax=1.6*S,seed=405))
# figures
for fi in range(nf):
    fd=FigureDrawing(ex,fi,skip_joints=('lHip','rHip','lAnkle','rAnkle','lWrist','rWrist'))
    draw_figure(C,fd,seed=fi,weight=0.8,cons_dens=0.55)
# breaths: small hand-drawn loops closing, above heads
def breath(p,r,seed,temp=0.0,dens=0.9):
    th0=rng.uniform(0,6)
    t=np.linspace(0,1,80)
    ang=th0+t*2*np.pi*1.12
    rr=r*(1+0.18*t)
    P=np.stack([p[0]+rr*np.cos(ang),p[1]+rr*np.sin(ang)*0.85],1)
    C.add(pen(P,wmin=1.1*S,wmax=1.6*S,seed=seed,taper_in=3,taper_out=5,temp=temp,dens=dens,k0=1/6))
for fi in range(nf):
    hp=ex.jpos(fi,'head')+np.array([0,0.62,0])
    p=P3(hp)[0]; ppu=np.linalg.norm(P3(hp)[0]-P3(hp+[0,1,0])[0])
    breath(p+np.array([rng.uniform(-0.15,0.15)*ppu,0]),ppu*0.11,700+fi,temp=(0.6 if fi==1 else 0.0))
for k in range(14):   # people inside the homes breathing too: loops at windows
    X=np.array([rng.uniform(-13,14),rng.uniform(2.2,5.5),rng.choice([-6.3,-6.3,-6.3])])
    p=P3(X)[0]; ppu=np.linalg.norm(P3(X)[0]-P3(X+[0,1,0])[0])
    breath(p,ppu*0.14,800+k,dens=0.55)
C.render(f'{OUT}/p15.png' if S==1 else f'{WORK}/p15_big.png',light=(W*0.5,H*0.6,W*0.5,0.45),vignette=0.55,glow=0.7)
print('done',time.time()-t0)
