import sys, numpy as np
from scene import *
W,H=1280,720
A={'pelvis':[0,0,3],'lShoulder':[-4,0,7],'rShoulder':[-8,0,-8],'rElbow':[-14,0,0],'lElbow':[-10,0,0],'chest':[2,12,-4],'head':[8,14,-7],'lHip':[-6,0,5],'rHip':[4,0,-2],'lKnee':[8,0,0]}
B={'pelvis':[0,0,-3],'lShoulder':[-22,0,9],'lElbow':[-40,0,0],'rShoulder':[-4,0,-7],'chest':[0,-12,4],'head':[6,-14,6],'lHip':[3,0,2],'rHip':[-5,0,-5],'rKnee':[7,0,0]}
REACH={'pelvis':[0,0,0],'chest':[16,8,0],'head':[4,10,0],'rShoulder':[-62,0,-6],'rElbow':[-12,0,0],'lShoulder':[-30,0,8],'lElbow':[-20,0,0],
       'lHip':[-10,0,3],'rHip':[12,0,-3],'rKnee':[16,0,0]}
spec={'camera':{'fov':21,'pos':[0,1.3,10.5],'target':[0,1.05,0],'near':4,'far':20},
      'figures':[fig('stand',A,pos=(-1.0,0,0),rot=(0,36,0)),fig('stand',B,pos=(1.0,0,0),rot=(0,-36,0)),
                 fig('stand',REACH,pos=(-0.92,0,0.02),rot=(0,40,0))]}
ex=extract('p09',spec,W,H)
fa=FigureDrawing(ex,0); fb=FigureDrawing(ex,1); fg=FigureDrawing(ex,2,cons=False)
C=Canvas(W,H,ss=2,seed=91)
def chest_pt(fi):
    M=ex.jmat(fi,'chest'); return ex.project((M@np.array([0,0.26,0.12,1]))[:3][None])[0][0]
ca,cb=chest_pt(0),chest_pt(1)
print('chests',ca,cb)
# the loop: leaves A's chest rising, arcs over, lands in B's chest, returns beneath and closes at A
mid=(ca+cb)/2; rx=np.linalg.norm(cb-ca)/2; ry=rx*0.97
t=np.linspace(np.pi,np.pi+2*np.pi*1.035,900)   # from A, over the top to B, beneath and back
lp=np.stack([mid[0]+rx*np.cos(t),mid[1]-ry*np.sin(-t)*-1],1)
lp=np.stack([mid[0]+rx*np.cos(t),mid[1]+ry*np.sin(t)],1)
lp=jitter(lp,1.2,120,3)
s=arclen(lp); L=s[-1]
temp=np.clip((s/L-0.72)/0.28,0,1)**2.2*0.7        # the closing stretch still warm, cooling
fam=fig_mask(ex,0,W,H,dilate=0); fbm=fig_mask(ex,1,W,H,dilate=0)
# loop passes in front of both chests: gap the figure lines where it crosses
gap=line_mask([lp],W,H,4.5)
# the moment before: a faint ghost of the reaching posture, now let go
draw_figure(C,fg,seed=21,weight=0.7,dens=0.22,gaps=gap|fig_mask(ex,0,W,H,dilate=3))
draw_figure(C,fa,seed=3,gaps=gap)
draw_figure(C,fb,seed=4,gaps=gap)
st=pen(lp,wmin=2.4,wmax=4.0,seed=9,taper_in=8,taper_out=26,k0=1/60,temp=temp)
C.add(st)
# ground
gy=max(fa.main[:,1].max(),fb.main[:,1].max())
C.add(pen(seg((300,gy+1),(980,gy)),wmin=1.6,wmax=2.0,seed=12,taper_in=60,taper_out=60))
C.render(f'{OUT}/p09.png',light=(640,mid[1],520,0.5),vignette=0.6,glow=0.6)
