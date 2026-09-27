import sys, numpy as np
from scene import *
W,H=1280,720
pose={'lHip':[-84,0,5],'rHip':[-84,0,-5],'lKnee':[92,0,0],'rKnee':[92,0,0],'lAnkle':[-4,0,0],'rAnkle':[-4,0,0],
      'pelvis':[8,0,0],'chest':[30,0,0],'head':[30,0,0],
      'lShoulder':[-34,0,8],'rShoulder':[-34,0,-8],'lElbow':[-52,0,0],'rElbow':[-52,0,0],'lWrist':[10,0,0],'rWrist':[10,0,0]}
spec={'camera':{'fov':20,'pos':[-7.2,0.98,0.2],'target':[0,0.85,0.2],'near':2,'far':14},
      'figures':[fig('stand',pose,rot=(0,0,0),ground=0)]}
ex=extract('p03',spec,W,H)
fd=FigureDrawing(ex,0)
C=Canvas(W,H,ss=2,seed=31)
m=fd.main
# joints for stool placement
hipL=ex.jpos(0,'lHip'); hipR=ex.jpos(0,'rHip'); pel=ex.jpos(0,'pelvis')
seat_y=min(hipL[1],hipR[1])-0.075
print('seat',seat_y, 'pelvis',pel)
# stool: seat centred under pelvis (in z), profile view -> screen x maps to world z
def P(x,y,z): return ex.project(np.array([[x,y,z]]))[0][0]
zc=pel[2]-0.02
seat=[P(0,seat_y,zc-0.22),P(0,seat_y,zc+0.22)]
seat2=[P(0,seat_y-0.05,zc-0.22),P(0,seat_y-0.05,zc+0.22)]
fm=fig_mask(ex,0,W,H,dilate=3)
stool=[poly(seat[0],seat[1],seat2[1],seat2[0],seat[0]),
       seg(P(0,seat_y-0.05,zc-0.17),P(0,0,zc-0.27)), seg(P(0,seat_y-0.05,zc+0.17),P(0,0,zc+0.27)),
       seg(P(0,seat_y-0.05,zc-0.02),P(0,0,zc+0.02)),
       seg(P(0,0.16,zc-0.24),P(0,0.16,zc+0.24))]
for i,S in enumerate(stool):
    for Q in hide(jitter(S,0.6,50,i),fm):
        C.add(pen(Q,wmin=2.0,wmax=3.0,seed=40+i,taper_in=5,taper_out=6,k0=1/20))
# floor line (short, just under the stool and feet)
gy=P(0,0,0)[1]
C.add(pen(seg((520,gy+0.5),(1180,gy)),wmin=1.8,wmax=2.2,seed=77,taper_in=40,taper_out=60))
# back contour: silhouette points on the back (left side of torso), from neck down to pelvis
neck=ex.project(ex.jpos(0,'head')[None])[0][0]
pelv=ex.project(ex.jpos(0,'pelvis')[None])[0][0]
cand=np.where((m[:,1]>neck[1]-10)&(m[:,1]<pelv[1]+5)&(m[:,0]<neck[0]+25))[0]
# pick contiguous run of the back: the points with smallest x per y band
back=m[cand]
back=back[np.argsort(back[:,1])]
ys=np.arange(neck[1]-4,pelv[1],2.0)
bx=[]
for y in ys:
    sel=np.abs(m[:,1]-y)<1.2
    cands=m[sel]
    if len(cands)==0: bx.append(np.nan); continue
    left=cands[cands[:,0]<pelv[0]+60]
    bx.append(left[:,0].min() if len(left) else np.nan)
bx=np.array(bx); ok=~np.isnan(bx)
back=np.stack([bx[ok],ys[ok]],1)
back=smooth_path(resample(back,1.0)[0],4)
print('back pts',len(back),back[0],back[-1])
nrm=np.stack([-np.gradient(back[:,1]),np.gradient(back[:,0])],1); nrm/=np.linalg.norm(nrm,axis=1,keepdims=True)+1e-9
if nrm[len(nrm)//2,0]>0: nrm=-nrm   # point outward (left, away from body)
rng=np.random.RandomState(7)
top=back[0]
for k,(off,y0,peak,endf) in enumerate([(10,560,196,0.98),(22,610,222,0.86),(34,660,248,0.72)]):
    bc=back+nrm*off
    bc=bc[:int(len(bc)*endf)]
    b0=bc[0]
    xs=np.linspace(-10,b0[0]-120-12*k,11)
    f=((xs-xs[0])/(xs[-1]-xs[0]))
    trend=y0+(peak-y0)*f**1.6
    noise=rng.normal(0,9,len(xs)); noise[0]=0; noise[-2:]*=0.25
    rise=np.stack([xs,trend+noise],1)
    # arc over the shoulders and settle onto the back
    c1=np.array([b0[0]-40-8*k,peak-22-6*k])
    arc=spline([rise[-1],c1,b0+np.array([-6,-10]),b0],n_per=24,tension=0.5)
    path=join(rise,arc,bc)
    s_=arclen(path); L=s_[-1]
    dens=np.interp(s_,[0,L*0.25,L],[0.6,0.9,1.0])
    st=pen(path,wmin=1.6,wmax=2.6,seed=90+k,taper_in=0,taper_out=40,dens=dens,k0=1/30,wobble=0.3)
    C.add(st)
    # data points on the rising part
    for p in rise[1:-1]:
        C.add(pen(circle(p[0],p[1],2.2,0,2*np.pi),wmin=1.2,wmax=1.4,seed=int(p[0]),taper_in=0,taper_out=0,dens=0.8))
draw_figure(C,fd,seed=6)
C.render(f'{OUT}/p03.png',light=(760,420,420,0.55),vignette=0.6)
