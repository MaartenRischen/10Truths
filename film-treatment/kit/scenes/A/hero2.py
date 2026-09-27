import sys, time, numpy as np
from scene import *
from scipy import ndimage as _ndi
t0=time.time()
S=1.5
W,H=int(1280*S),int(720*S)
MX=lambda P: np.stack([W-np.asarray(P)[...,0],np.asarray(P)[...,1]],-1)   # mirror in x
pose={'rShoulder':[-34,0,-10],'rElbow':[-16,0,0],'rWrist':[-10,0,0],'lShoulder':[-2,0,6],'lElbow':[-8,0,0],
      'chest':[4,0,0],'head':[2,0,0],'lHip':[-4,0,3],'rHip':[3,0,-3]}
spec={'camera':{'fov':22,'pos':[-3.35,1.35,15],'target':[-3.35,1.05,0],'near':5,'far':30},
      'figures':[fig('stand',pose,rot=(0,-38,0))]}
ex=extract('hero2m',spec,W,H)
fd=FigureDrawing(ex,0)
m=fd.main; top=m[:,1].min(); gy=m[:,1].max(); hf=gy-top; fx=(m[:,0].min()+m[:,0].max())/2
M=ex.jmat(0,'chest'); chest=ex.project((M@np.array([0,0.24,0.12,1]))[:3][None])[0][0]
print('fig',fx,top,gy,'chest',chest)
C=Canvas(W,H,ss=2,seed=1203)
rng=np.random.RandomState(10)
hor=H*0.55
f=(gy-hor)*9.0
N=int(150000*S*S)
X=rng.uniform(-60,140,N); Z=np.exp(rng.uniform(np.log(2.6),np.log(260),N))
g=_ndi.gaussian_filter(np.random.RandomState(3).standard_normal((64,256)),(1.6,2.2)); g=(g-g.mean())/g.std()
gi=np.clip(((np.log(Z)-np.log(2.6))/(np.log(260)-np.log(2.6))*63).astype(int),0,63); gj=np.clip(((X+60)/200*255).astype(int),0,255)
clust=np.clip(0.55+0.45*g[gi,gj],0.05,1.0)
px=W*0.26+f*X/Z; py=hor+f*1.0/Z
px=W-px   # mirrored field
dxf=(px-fx)/(hf*1.1); dyf=(py-gy)/(hf*0.5)
keep=(px>-5)&(px<W+5)&(py<H+5)
near=np.exp(-(dxf**2+dyf**2))
keep&=rng.rand(N)>near*0.97
keep&=rng.rand(N)<clust
keep&=rng.rand(N)<np.clip((W-px-W*0.10)/(W*0.4),0.05,1)
px,py,Z=px[keep],py[keep],Z[keep]
r=np.clip(1.5*S*9.0/Z,0.3*S,1.6*S)
dens=np.clip(0.9-0.5*(np.log(Z)-np.log(4.5))/(np.log(260)-np.log(4.5)),0.25,0.9)*rng.uniform(0.45,1.0,len(Z))
dens*=np.clip((py-hor)/(6*S)+0.25,0,1)
print('dots',len(px))
C._stamp(np.stack([px*C.ss,py*C.ss],1),r*C.ss,np.zeros(len(r)),dens,np.ones(len(r),np.uint8),_rec=False)
_yy,_xx=np.mgrid[0:H,0:W]
_haze=np.exp(-((_yy-hor)/(10*S))**2)*np.clip((W-_xx-W*0.18)/(W*0.4),0,1)+0.5*np.exp(-((_yy-hor-8*S)/(40*S))**2)*np.clip((W-_xx-W*0.25)/(W*0.5),0,1)
C.fill(_haze.astype(np.float32),strength=0.045)
# phone (mirrored placement)
phw,phh=W*0.052,H*0.19
pc=np.array([W-(W*0.66+phw/2),H*0.33+phh/2])
ang=np.radians(8)
def rot(P,c):
    cc,sn=np.cos(ang),np.sin(ang); Q=P-c; return np.stack([c[0]+cc*Q[:,0]-sn*Q[:,1],c[1]+sn*Q[:,0]+cc*Q[:,1]],1)
phone=rot(rrect(pc[0]-phw/2,pc[1]-phh/2,phw,phh,phw*0.18),pc)
C.add(pen(phone,wmin=2.0*S,wmax=3.0*S,seed=3,taper_in=0,taper_out=0,k0=1/10))
C.add(pen(rot(seg((pc[0]-phw*0.15,pc[1]+phh*0.4),(pc[0]+phw*0.15,pc[1]+phh*0.4)),pc),wmin=1.4*S,wmax=1.6*S,seed=4))
C.fill(np.exp(-(((_xx-pc[0])/(phw*1.2))**2+((_yy-pc[1])/(phh*0.8))**2)).astype(np.float32),strength=0.035)
hs=9*S
hx,hy=pc[0]-phw*1.55,pc[1]-phh*0.62
t=np.linspace(0,2*np.pi,120)
heart=np.stack([hx+hs*(16*np.sin(t)**3)/16,hy-hs*(13*np.cos(t)-5*np.cos(2*t)-2*np.cos(3*t)-np.cos(4*t))/16],1)
C.add(pen(heart,wmin=1.6*S,wmax=2.4*S,seed=5,taper_in=0,taper_out=0,k0=1/6))
num,_=handwrite('12',hx+hs*1.5,hy+hs*0.9,34*S)
for Pn in num: C.add(pen(Pn,wmin=1.4*S,wmax=2.4*S,seed=6,taper_in=2,taper_out=3,k0=1/6))
# the ember loop, mirrored: from the chest leftwards, spinning open around the phone
th=np.linspace(np.pi*0.62,np.pi*0.62-2*np.pi*2.3,1200)
u=np.linspace(0,1,len(th))
rxs=phw*1.25+u*phw*1.1; rys=phh*0.62+u*phh*0.35
cxm=W-pc[0]
sp=np.stack([cxm+u*phw*0.35+rxs*np.cos(th),pc[1]-u*phh*0.12+rys*np.sin(th)],1)
sp=MX(sp)
sp=rot(sp,pc)
tan0=sp[3]-sp[0]; tan0/=np.linalg.norm(tan0)
reach=[chest,chest+np.array([-W*0.08,-H*0.03]),np.array([W*0.66,H*0.36]),np.array([W*0.5,H*0.5]),sp[0]-tan0*phw*1.1,sp[0]]
lead=spline(reach,n_per=50,tension=0.5)
loop=jitter(join(lead,sp),1.2*S,90,4)
s_=arclen(loop); L=s_[-1]
st=pen(loop,wmin=2.0*S,wmax=3.6*S,seed=7,taper_in=10,taper_out=0,k0=1/50,temp=np.clip(0.55+s_/(L*0.03),0,1))
C.add(st)
C.bead(st.P[-1,0],st.P[-1,1],3.4*S,temp=1.0)
draw_figure(C,fd,seed=6)
# the alarm dot in the chest where the loop begins
for r_,tp in [(3.6*S,0.7),(2.0*S,0.9),(0.7*S,1.0)]:
    C.add(pen(circle(chest[0],chest[1],r_),wmin=2.0*S,wmax=2.4*S,seed=int(r_*10),temp=tp,taper_in=0,taper_out=0))  # alarm dot
C.add(pen(seg((fx-hf*0.35,gy+1),(fx+hf*0.45,gy)),wmin=1.5*S,wmax=1.9*S,seed=8,taper_in=40*S,taper_out=40*S))
C.render(f'{OUT}/hero-2.png',light=(W*0.45,H*0.45,W*0.45,0.45),vignette=0.6,glow=1.0)
print('done',time.time()-t0)
