import sys, time, numpy as np
from scene import *
from scipy import ndimage as ndi
t0=time.time()
W,H=1920,1080
S=1.5
pose={'lShoulder':[-6,0,8],'rShoulder':[-30,0,-12],'rElbow':[-22,0,0],'rWrist':[-10,0,0],'lElbow':[-10,0,0],
      'chest':[4,-8,0],'head':[6,-10,0],'lHip':[-2,0,3],'rHip':[3,0,-3]}
cam={'fov':28,'pos':[1.9,1.75,7.6],'target':[0.1,1.25,-14],'near':0.5,'far':500}
spec={'camera':cam,'figures':[fig('stand',pose,pos=(-1.2,0,0),rot=(0,200,0))]}
ex=extract('hero2b',spec,W,H)
fd=FigureDrawing(ex,0)
m=fd.main; top=m[:,1].min(); gy=m[:,1].max(); hf=gy-top; fx=(m[:,0].min()+m[:,0].max())/2
print('fig',fx,top,gy,hf)
C=Canvas(W,H,ss=2,seed=1202)
def P3(X): return ex.project(np.atleast_2d(np.asarray(X,float)))
rng=np.random.RandomState(12)
# ---- the field of strangers on the ground plane, in true perspective
N=900000
# uniform-per-area sampling of depth (pdf ~ Z) so the near field is sparse and the far field dense
Zmax=420.0; Zmin=1.5
uu=rng.rand(N)
Zd=np.sqrt(Zmin**2+uu*(Zmax**2-Zmin**2))
Z=-Zd; X=rng.uniform(-1,1,N)*Zd*0.95+rng.normal(0,0.2,N)
keep=rng.rand(N)<np.clip(0.18+0.82*(Zd/60)**0.5,0,1)*0.55
keep&=np.hypot(X+1.2,Z+0.2)>rng.uniform(2.0,4.0,N)
X,Z=X[keep],Z[keep]
P2,dep=P3(np.stack([X,np.zeros_like(X),Z],1))
inside=(P2[:,0]>-4)&(P2[:,0]<W+4)&(P2[:,1]>-4)&(P2[:,1]<H+4)
P2,dep=P2[inside],dep[inside]
fm=fig_mask(ex,0,W,H,dilate=2)
xi=np.clip(P2[:,0].astype(int),0,W-1); yi=np.clip(P2[:,1].astype(int),0,H-1)
vis=~fm[yi,xi]
P2,dep=P2[vis],dep[vis]
ppu=np.array([np.linalg.norm(P3([0,0,-d])[0][0]-P3([0,0.05,-d])[0][0]) for d in [1]])[0]
r=np.clip(0.045*(ex.Pm[1,1]*H/2)/dep,0.3*S,1.9*S)
dens=np.clip(0.95-0.55*np.log(dep/2)/np.log(210),0.25,0.95)*rng.uniform(0.4,1,len(dep))
print('dots',len(P2))
C._stamp(P2*C.ss,r*C.ss,np.zeros(len(r)),dens,np.ones(len(r),np.uint8),_rec=False)
hor=P3([0,0,-4000])[0][0][1]
_yy,_xx=np.mgrid[0:H,0:W]
C.fill((np.exp(-((_yy-hor)/12)**2)+0.5*np.exp(-((_yy-hor-10)/46)**2)).astype(np.float32),strength=0.045)
# ---- the phone floating in the middle distance, "12" hearts
pcw=np.array([3.4,2.3,-13.5])
pc=P3(pcw)[0][0]; ph_h=np.linalg.norm(P3(pcw+[0,0.55,0])[0][0]-P3(pcw-[0,0.55,0])[0][0]); ph_w=ph_h*0.5
ang=np.radians(-9)
def rot(P,c):
    cc,sn=np.cos(ang),np.sin(ang); Q=P-c; return np.stack([c[0]+cc*Q[:,0]-sn*Q[:,1],c[1]+sn*Q[:,0]+cc*Q[:,1]],1)
phone=rot(rrect(pc[0]-ph_w/2,pc[1]-ph_h/2,ph_w,ph_h,ph_w*0.18),pc)
C.add(pen(phone,wmin=2.2,wmax=3.2,seed=3,taper_in=0,taper_out=0,k0=1/10))
C.add(pen(rot(seg((pc[0]-ph_w*0.15,pc[1]+ph_h*0.4),(pc[0]+ph_w*0.15,pc[1]+ph_h*0.4)),pc),wmin=1.6,wmax=1.8,seed=4))
C.fill(np.exp(-(((_xx-pc[0])/(ph_w*1.3))**2+((_yy-pc[1])/(ph_h*0.9))**2)).astype(np.float32),strength=0.035)
hx,hy=pc[0]+ph_w*1.15,pc[1]-ph_h*0.62
t=np.linspace(0,2*np.pi,120); hs=11
heart=np.stack([hx+hs*(16*np.sin(t)**3)/16,hy-hs*(13*np.cos(t)-5*np.cos(2*t)-2*np.cos(3*t)-np.cos(4*t))/16],1)
C.add(pen(heart,wmin=2.0,wmax=3.0,seed=5,taper_in=0,taper_out=0,k0=1/6))
num,_=handwrite('12',hx+hs*1.6,hy+hs*0.9,44)
for Pn in num: C.add(pen(Pn,wmin=1.8,wmax=3.0,seed=6,taper_in=2,taper_out=3,k0=1/6))
# ---- the ember loop: from the chest, out over the field, spinning open around the phone
M=ex.jmat(0,'chest'); chest=P3((M@np.array([-0.14,0.26,0.06,1]))[:3])[0][0]
th=np.linspace(np.pi*0.62,np.pi*0.62-2*np.pi*2.4,1400)
u=np.linspace(0,1,len(th))
rxs=ph_w*1.5+u*ph_w*1.6; rys=ph_h*0.6+u*ph_h*0.42
cx_=pc[0]+u*ph_w*0.5; cy_=pc[1]-u*ph_h*0.1
sp=rot(np.stack([cx_+rxs*np.cos(th),cy_+rys*np.sin(th)],1),pc)
tan0=sp[3]-sp[0]; tan0/=np.linalg.norm(tan0)
reach=[chest,chest+np.array([110,-50]),np.array([W*0.5,H*0.33]),sp[0]-tan0*ph_w*1.6,sp[0]]
lead=spline(reach,n_per=50,tension=0.5)
loop=jitter(join(lead,sp),1.4,110,4)
s_=arclen(loop); L=s_[-1]
temp=np.clip(s_/(L*0.06),0,1)
# perspective: the loop thins as it travels away
press=np.interp(s_,[0,L*0.35,L],[1.25,0.85,0.7])
st=pen(loop,wmin=2.2,wmax=4.2,seed=7,taper_in=14,taper_out=0,k0=1/60,temp=temp,press=press)
C.add(st)
C.bead(st.P[-1,0],st.P[-1,1],4.2,temp=1.0)
gm=line_mask([lead[:40]],W,H,5)
draw_figure(C,fd,seed=6,gaps=gm)
C.render(f'{OUT}/hero-2.png',light=(W*0.55,H*0.42,W*0.5,0.45),vignette=0.62,glow=1.0)
print('done',time.time()-t0)
