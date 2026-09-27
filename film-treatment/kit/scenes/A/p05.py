import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
from scene import *
W,H=1280,720
pose={'lShoulder':[0,0,17],'rShoulder':[0,0,-17],'lElbow':[-6,0,0],'rElbow':[-6,0,0],'lHip':[0,0,4],'rHip':[0,0,-4],'head':[2,0,0]}
spec={'camera':{'fov':20,'pos':[0,1.05,8.2],'target':[0,0.98,0],'near':3,'far':15},'figures':[fig('stand',pose)]}
ex=extract('p05',spec,W,H)
fd=FigureDrawing(ex,0)
m=fd.main
fmask=fig_mask(ex,0,W,H)
feet=np.array([(m[:,0].min()+m[:,0].max())/2,m[:,1].max()])
print('feet',feet,'h',fd.height())
# doorway = the same outline, slightly larger, offset right/up (behind), a hair rotated
dx,dy,sc,ang=50,-10,1.035,np.radians(1.4)
def T(P):
    c,s=np.cos(ang),np.sin(ang)
    Q=(P-feet)*sc
    Q=np.stack([c*Q[:,0]-s*Q[:,1],s*Q[:,0]+c*Q[:,1]],1)
    return Q+feet+[dx,dy]
raw=fd.sil_raw[0]
door=T(raw)
# doorway mask via polygon fill
from PIL import ImageDraw
im=Image.new('L',(W*2,H*2),0); ImageDraw.Draw(im).polygon([(x*2,y*2) for x,y in door],fill=255)
dmask=np.asarray(im,np.float32).reshape(H,2,W,2).mean(axis=(1,3))/255.0
C=Canvas(W,H,ss=2,seed=51)
C.paper(light=(feet[0],feet[1]-200,420,0.45),vignette=0.62)
fm2=fig_mask(ex,0,W,H,dilate=3.5)
# light through the doorway (brighter toward the floor), figure silhouetted against it
yy=np.arange(H)[:,None]*np.ones((1,W))
grad=np.clip((yy-(feet[1]-420))/420,0,1)**0.8
body=ndi.gaussian_filter(fmask.astype(np.float32),0.7)
glow=ndi.gaussian_filter(dmask,1.2)*(0.55+0.45*grad)*(1-body)
C.fill(glow,strength=0.24)
halo=ndi.gaussian_filter(dmask,14)*(1-body)
C.fill(halo,strength=0.05)
# light spilling onto the floor in front of the doorway
fy=feet[1]+dy
spill=np.zeros((H,W),np.float32)
xs=np.arange(W)[None,:]*np.ones((H,1))
for y in range(int(fy),H):
    t=(y-fy)/220.0
    if t>1: break
    half=60+160*t
    spill[y]=np.clip(1-np.abs(xs[y]-(feet[0]+dx+22*t))/half,0,1)**0.6*(1-t)**1.6
spill=ndi.gaussian_filter(spill,6)*(1-body)
C.fill(spill,strength=0.07)
# wall surface: faint horizontal hatching that stops at the opening
wy0,wy1=60,fy-4
ctr=np.array([feet[0]+dx,(wy0+wy1)/2])
dm_d=ndi.binary_dilation(dmask>0.4,iterations=5)
rngw=np.random.RandomState(8)
ys_=[]; y=wy0+8
while y<wy1-6:
    ys_.append(y); y+=rngw.uniform(13,21)
for k,y in enumerate(ys_):
    half=500*np.sqrt(max(0.0,1-((y-ctr[1])/330)**2))*rngw.uniform(0.75,1.0)
    if half<60: continue
    x0=ctr[0]-half+rngw.uniform(-40,40); x1=ctr[0]+half+rngw.uniform(-40,40)
    sl=rngw.uniform(-2.5,2.5)
    L=seg((x0,y-sl),(x1,y+sl))
    for Q in hide(jitter(L,0.5,90,k),dm_d|fm2):
        s_=arclen(Q); Ls=s_[-1]
        dd=0.16*np.clip(1-np.abs((Q[:,0]-ctr[0])/half)**2,0,1)+0.02
        C.add(pen(Q,wmin=1.0,wmax=1.2,seed=300+k,taper_in=20,taper_out=20,dens=dd,k0=1/40,wobble=0.3))
# floor line
C.add(pen(seg((140,fy+0.5),(1140,fy-0.5)),wmin=1.6,wmax=2.0,seed=5,taper_in=80,taper_out=80))
# doorway outline (hidden where the figure stands in front)
for Q in hide(door,fm2):
    C.add(pen(Q,wmin=1.6,wmax=2.8,seed=11+len(Q),taper_in=6,taper_out=6,k0=1/14,dens=0.9))
# jamb depth: the doorway edge seen through the opening on its right side
jamb=door+np.array([-9,5])
jm=(dmask>0.5)
jm=ndi.binary_erosion(jm,iterations=2)
for Q in hide(jamb,~jm|fm2):
    if len(Q)>6:
        C.add(pen(Q,wmin=1.0,wmax=1.6,seed=21+len(Q),taper_in=6,taper_out=6,k0=1/14,dens=0.45))
draw_figure(C,fd,seed=9)
C.render(f'{OUT}/p05.png')
