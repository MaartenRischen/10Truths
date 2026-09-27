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
mx0,mx1=870*S,1150*S; my0,my1=262*S,gy
RW=1.7*S
def R(P,w=RW,dens=1.0): C.add(ruled(P,w=w,dens=dens))
body=np.array([[mx0,my1],[mx0+10*S,my0],[mx1-10*S,my0],[mx1,my1],[mx0,my1]])
R(body)
R(np.array([[mx0+22*S,my0+30*S],[mx1-22*S,my0+30*S]]),w=1.2*S,dens=0.7)
for yy_ in (my0+60*S,my0+90*S):
    for xx_ in np.arange(mx0+30*S,mx1-40*S,26*S):
        R(circle(xx_,yy_,3.2*S),w=1.0*S,dens=0.6)
# coin slot + spout on the front face
sx0,sx1,sy=mx0+40*S,mx0+110*S,my1-150*S
R(np.array([[sx0,sy],[sx1,sy],[sx1,sy+9*S],[sx0,sy+9*S],[sx0,sy]]),w=1.3*S)
spout=np.array([[sx0-4*S,sy+9*S],[sx0-40*S,sy+34*S],[sx1-40*S,sy+34*S],[sx1+4*S,sy+9*S]])
R(spout,w=1.4*S)
# spool on top where the threads wind
sp_c=np.array([mx0+70*S,my0-42*S]); sp_r=38*S; sp_len=80*S
R(circle(sp_c[0],sp_c[1],sp_r*0.35,ry=sp_r))
R(circle(sp_c[0]+sp_len,sp_c[1],sp_r*0.35,ry=sp_r,th0=-np.pi/2,sweep=np.pi))
R(np.array([[sp_c[0],sp_c[1]-sp_r],[sp_c[0]+sp_len,sp_c[1]-sp_r]])); R(np.array([[sp_c[0],sp_c[1]+sp_r],[sp_c[0]+sp_len,sp_c[1]+sp_r]]))
R(np.array([[sp_c[0]+sp_len*0.5,sp_c[1]+sp_r],[sp_c[0]+sp_len*0.5,my0]]))
R(np.array([[sp_c[0]-10*S,sp_c[1]+sp_r+6*S],[sp_c[0]+sp_len+10*S,sp_c[1]+sp_r+6*S]]),w=1.2*S)
# gears
def gear(c,r,teeth,ph=0):
    a=np.linspace(0,2*np.pi,teeth*8+1)+ph
    rr=r+np.where((np.floor(a/(2*np.pi/teeth)*2)%2)==0,4.5*S,0)
    return np.stack([c[0]+rr*np.cos(a),c[1]+rr*np.sin(a)],1)
g1=np.array([sp_c[0]+sp_len+40*S,my0-30*S]); g2=g1+np.array([60*S,-18*S])
R(gear(g1,24*S,12)); R(circle(g1[0],g1[1],5*S))
R(gear(g2,36*S,18,0.1)); R(circle(g2[0],g2[1],6*S))
# the crank wheel on the side
wc=np.array([mx1-6*S,my0+160*S]); wr=88*S
R(circle(wc[0],wc[1],wr)); R(circle(wc[0],wc[1],wr*0.84),w=1.1*S,dens=0.7); R(circle(wc[0],wc[1],8*S))
for k in range(6):
    a=k*np.pi/3+0.2
    R(np.array([[wc[0]+8*S*np.cos(a),wc[1]+8*S*np.sin(a)],[wc[0]+wr*0.84*np.cos(a),wc[1]+wr*0.84*np.sin(a)]]),w=1.2*S)
a=-0.9
hp=wc+wr*0.84*np.array([np.cos(a),np.sin(a)])
R(np.array([hp,hp+np.array([34*S,0])]),w=2.0*S); R(circle(hp[0]+44*S,hp[1],10*S,ry=6*S),w=1.8*S)
# rotation arrow
arc=circle(wc[0],wc[1],wr+18*S,th0=-1.9,sweep=1.3)
R(arc,w=1.3*S,dens=0.8)
e=arc[-1]; d=arc[-1]-arc[-4]; d/=np.linalg.norm(d); nrm=np.array([-d[1],d[0]])
R(np.array([e-d*10*S+nrm*6*S,e,e-d*10*S-nrm*6*S]),w=1.3*S,dens=0.8)
# belt from spool gear to wheel
R(np.array([g2+np.array([0,36*S]),wc+np.array([-wr*0.2,-wr*0.97])]),w=1.2*S,dens=0.8)
# coins: falling from the spout into a pile on the ground in front of the machine
rng=np.random.RandomState(4)
lip=np.array([(sx0+sx1)/2-40*S,sy+38*S])
for k,(ox,oy,ang) in enumerate([(-6,14,0.3),(-16,44,1.1),(-10,80,-0.5)]):
    c=lip+np.array([ox*S,oy*S])
    R(circle(c[0],c[1],10*S,ry=4*S,rot=ang),w=1.3*S)
pile_c=np.array([lip[0]-14*S,gy])
for k,(col,row) in enumerate([(-2,0),(-1,0),(0,0),(1,0),(2,0),(-1.5,1),(-0.5,1),(0.5,1),(1.5,1),(-1,2),(0,2),(1,2),(-0.5,3),(0.5,3)]):
    c=pile_c+np.array([col*19*S+rng.uniform(-2,2)*S,-5*S-row*8*S])
    R(circle(c[0],c[1],10*S,ry=4*S),w=1.3*S)
# ground: ruled under the machine, hand line under the figure
R(np.array([[mx0-140*S,gy+1],[W-30*S,gy+1]]),w=1.4*S,dens=0.8)
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
