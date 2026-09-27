import sys, time, numpy as np
from scene import *
t0=time.time()
S=float(sys.argv[1]) if len(sys.argv)>1 else 1.0
W,H=int(1280*S),int(720*S)
pose={'lShoulder':[-34,0,10],'lElbow':[-16,0,0],'lWrist':[-10,0,0],'rShoulder':[-2,0,-6],'rElbow':[-8,0,0],
      'chest':[4,0,0],'head':[2,0,0],'lHip':[-4,0,3],'rHip':[3,0,-3]}
spec={'camera':{'fov':22,'pos':[3.2,1.35,15],'target':[3.2,1.05,0],'near':5,'far':30},
      'figures':[fig('stand',pose,rot=(0,38,0))]}
ex=extract('p10' if S==1 else 'p10big',spec,W,H)
fd=FigureDrawing(ex,0)
m=fd.main; top=m[:,1].min(); gy=m[:,1].max(); hf=gy-top; fx=(m[:,0].min()+m[:,0].max())/2
M=ex.jmat(0,'chest'); chest=ex.project((M@np.array([0,0.24,0.12,1]))[:3][None])[0][0]
print('fig',fx,top,gy,'chest',chest)
C=Canvas(W,H,ss=2,seed=101)
rng=np.random.RandomState(10)
# ---- the field: eight billion strangers on a plane receding to the horizon
hor=H*0.55
f=(gy-hor)*9.0
N=int(90000*S*S)
X=rng.uniform(-60,140,N); Z=np.exp(rng.uniform(np.log(2.6),np.log(260),N))
from scipy import ndimage as _ndi
_g=_ndi.gaussian_filter(np.random.RandomState(3).standard_normal((64,256)),(1.6,2.2)); _g=(_g-_g.mean())/_g.std()
_gi=np.clip(((np.log(Z)-np.log(2.6))/(np.log(260)-np.log(2.6))*63).astype(int),0,63); _gj=np.clip(((X+60)/200*255).astype(int),0,255)
clust=np.clip(0.55+0.45*_g[_gi,_gj],0.05,1.0)
# thin the field near the figure: the figure is alone
px=W*0.26+f*X/Z; py=hor+f*1.0/Z
dxf=(px-fx)/(hf*1.1); dyf=(py-gy)/(hf*0.5)
keep=(px>-5)&(px<W+5)&(py<H+5)
near=np.exp(-(dxf**2+dyf**2))
keep&=rng.rand(N)>near*0.97
keep&=rng.rand(N)<clust
keep&=rng.rand(N)<np.clip((px-W*0.10)/(W*0.4),0.05,1)
px,py,Z,clust=px[keep],py[keep],Z[keep],clust[keep]
r=np.clip(1.5*S*9.0/Z,0.3*S,1.6*S)
dens=np.clip(0.9-0.5*(np.log(Z)-np.log(4.5))/(np.log(260)-np.log(4.5)),0.25,0.9)*rng.uniform(0.45,1.0,len(Z))
# horizon glow fade
dens*=np.clip((py-hor)/(6*S)+0.25,0,1)
print('dots',len(px))
# horizon haze: the glow of countless distant lights
_yy,_xx=np.mgrid[0:H,0:W]
_haze=np.exp(-((_yy-hor)/(10*S))**2)*np.clip((_xx-W*0.18)/(W*0.4),0,1)+0.5*np.exp(-((_yy-hor-8*S)/(40*S))**2)*np.clip((_xx-W*0.25)/(W*0.5),0,1)
C.fill(_haze.astype(np.float32),strength=0.045)
ss=C.ss
C._stamp(np.stack([px*ss,py*ss],1),r*ss,np.zeros(len(r)),dens,np.ones(len(r),np.uint8))
# ---- phone + heart with a number
phx,phy,phw,phh=W*0.66,H*0.33,W*0.052,H*0.19
ang=np.radians(-8)
def rot(P,c): 
    cc,sn=np.cos(ang),np.sin(ang); Q=P-c; return np.stack([c[0]+cc*Q[:,0]-sn*Q[:,1],c[1]+sn*Q[:,0]+cc*Q[:,1]],1)
pc=np.array([phx+phw/2,phy+phh/2])
phone=rot(rrect(phx,phy,phw,phh,phw*0.18),pc)
cam_=rot(circle(pc[0],phy+phh*0.08,1.6*S),pc)
C.add(pen(phone,wmin=2.0*S,wmax=3.0*S,seed=3,taper_in=0,taper_out=0,k0=1/10))
C.add(pen(rot(seg((phx+phw*0.35,phy+phh*0.9),(phx+phw*0.65,phy+phh*0.9)),pc),wmin=1.4*S,wmax=1.6*S,seed=4))
# screen glow on the paper (a cold little light) -- bone, faint
yy,xx=np.mgrid[0:H,0:W]
C.fill(np.exp(-(((xx-pc[0])/(phw*1.2))**2+((yy-pc[1])/(phh*0.8))**2)),strength=0.035)
hx,hy=pc[0]+phw*1.05,phy-phh*0.12
t=np.linspace(0,2*np.pi,120); hs=9*S
heart=np.stack([hx+hs*(16*np.sin(t)**3)/16,hy-hs*(13*np.cos(t)-5*np.cos(2*t)-2*np.cos(3*t)-np.cos(4*t))/16],1)
C.add(pen(heart,wmin=1.6*S,wmax=2.4*S,seed=5,taper_in=0,taper_out=0,k0=1/6))
num,_=handwrite('12',hx+hs*1.5,hy+hs*0.9,34*S,font='EMSAllure.svg')
for Pn in num: C.add(pen(Pn,wmin=1.4*S,wmax=2.4*S,seed=6,taper_in=2,taper_out=3,k0=1/6))
# ---- the ember loop: from the chest, out, and spinning open around the phone
start=chest
th=np.linspace(np.pi*0.62,np.pi*0.62-2*np.pi*2.3,900)
rxs=phw*1.25+np.linspace(0,1,len(th))*phw*1.1
rys=phh*0.62+np.linspace(0,1,len(th))*phh*0.35
cx_=pc[0]+np.linspace(0,1,len(th))*phw*0.35
cy_=pc[1]-np.linspace(0,1,len(th))*phh*0.12
sp=np.stack([cx_+rxs*np.cos(th),cy_+rys*np.sin(th)],1)
sp=rot(sp,pc)
tan0=sp[3]-sp[0]; tan0/=np.linalg.norm(tan0)
reach=[start,start+np.array([W*0.08,-H*0.03]),np.array([W*0.34,H*0.36]),np.array([W*0.5,H*0.5]),sp[0]-tan0*phw*1.1,sp[0]]
lead=spline(reach,n_per=40,tension=0.5)
loop=join(lead,sp)
loop=jitter(loop,1.2*S,90,4)
s_=arclen(loop); L=s_[-1]
temp=np.clip(0.55+s_/(L*0.03),0,1)
st=pen(loop,wmin=2.0*S,wmax=3.6*S,seed=7,taper_in=10,taper_out=0,k0=1/50,temp=temp)
# gaps in the phone line where the loop passes over (front half of the spin)
C.add(st)
C.bead(st.P[-1,0],st.P[-1,1],3.4*S,temp=1.0)
draw_figure(C,fd,seed=6)
# the alarm dot in the chest where the loop begins
for r_,tp in [(3.6*S,0.7),(2.0*S,0.9),(0.7*S,1.0)]:
    C.add(pen(circle(chest[0],chest[1],r_),wmin=2.0*S,wmax=2.4*S,seed=int(r_*10),temp=tp,taper_in=0,taper_out=0))  # alarm dot
# a short ground under the figure only
C.add(pen(seg((fx-hf*0.45,gy+1),(fx+hf*0.35,gy)),wmin=1.5*S,wmax=1.9*S,seed=8,taper_in=40*S,taper_out=40*S))
C.render(f'{OUT}/p10.png' if S==1 else f'{WORK}/p10_big.png',light=(W*0.55,H*0.45,W*0.45,0.45),vignette=0.6,glow=1.0)
print('done',time.time()-t0)
