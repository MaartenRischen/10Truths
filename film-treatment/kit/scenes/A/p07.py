import sys, time, numpy as np
from scene import *
from figure import FigureDrawing
t0=time.time()
W,H=1280,720
X=[-5.95,-3.55,-1.17,1.2,3.58,5.95]
figs=[]; props=[]
def F(pose,ov,x,z,ry): figs.append(fig(pose,ov,pos=(x,0,z),rot=(0,ry,0)))
# 1 desire & jealousy: a couple hand in hand, a third watching from a distance
cx=X[0]
F('stand',{'rShoulder':[-30,0,-4],'rElbow':[-12,0,0],'head':[4,10,0],'lShoulder':[0,0,5]},cx-0.8,0,70)
F('stand',{'lShoulder':[-30,0,4],'lElbow':[-12,0,0],'head':[4,-10,0],'rShoulder':[0,0,-5]},cx-0.22,0,-70)
F('stand',{'lShoulder':[4,0,4],'rShoulder':[4,0,-4],'chest':[4,0,0],'head':[12,0,0],'lHip':[0,0,3],'rHip':[3,0,-3]},cx+0.9,0.2,-100)
# 2 reciprocity: food passed hand to hand
cx=X[1]
F('stand',{'rShoulder':[-62,0,-2],'lShoulder':[-58,0,2],'rElbow':[-20,0,0],'lElbow':[-20,0,0],'chest':[8,0,0],'head':[10,0,0]},cx-0.44,0,90)
F('stand',{'rShoulder':[-55,0,-6],'rElbow':[-25,0,0],'chest':[6,0,0],'head':[8,0,0],'lShoulder':[-6,0,4]},cx+0.46,0,-90)
# 3 gossip: two heads close, a hand to the mouth
cx=X[2]
F('stand',{'chest':[4,0,-12],'head':[4,20,-16],'lShoulder':[-40,-30,20],'lElbow':[-125,0,0],'rShoulder':[0,0,-6],'pelvis':[0,0,-3]},cx-0.3,0,15)
F('stand',{'chest':[2,0,6],'head':[6,-18,12],'lShoulder':[0,0,6],'rShoulder':[0,0,-6]},cx+0.26,0,-10)
# 4 belonging & shame: a close circle, one standing apart looking down
cx=X[3]
hc=cx-0.35
for k,a in enumerate([0.35,2.45,4.4]):
    r=0.36; x=hc+r*np.sin(a); z=r*np.cos(a)
    F('stand',{'lShoulder':[-22,0,14],'rShoulder':[-22,0,-14],'lElbow':[-40,0,0],'rElbow':[-40,0,0],'head':[6,0,0],'chest':[6,0,0]},x,z,np.degrees(np.arctan2(-(x-hc),-z)))
F('slump',{'head':[40,0,0],'chest':[18,0,0],'lShoulder':[-2,0,3],'rShoulder':[-2,0,-3]},cx+0.85,0.1,-115)
# 5 wariness: at the edge, facing a stranger
cx=X[4]
F('stand',{'lHip':[10,0,4],'rHip':[-14,0,-4],'rKnee':[10,0,0],'chest':[-4,0,0],'rShoulder':[-20,0,-10],'rElbow':[-50,0,0],'lShoulder':[4,0,10],'head':[-2,0,0]},cx-0.55,0,80)
F('standTall',{'lShoulder':[0,0,4],'rShoulder':[0,0,-4]},cx+0.7,0,-90)
# 6 grief: kneeling at a small mound
cx=X[5]
F('kneelGrief',{},cx-0.3,0,90)
spec={'camera':{'fov':7.0,'pos':[0,11.0,66],'target':[0,0.72,0],'near':40,'far':90},'figures':figs}
ex=extract('p07',spec,W,H)
print('extract',time.time()-t0)
C=Canvas(W,H,ss=2,seed=71)
def P3(Xw): return ex.project(np.atleast_2d(Xw))[0]
allmask=fig_mask(ex,None,W,H,dilate=2.0)
# ground line with a cursive loop between vignettes (world z=0.9 in front of the figures)
gy=lambda x: P3([x,0,0])[0][1]
pts=[]
xs=np.linspace(-8.2,8.2,900)
base=np.array([P3([x,0,0.35])[0] for x in xs])
line=[base[0]]
out=[]
bx=[(X[i]+X[i+1])/2 for i in range(5)]
cur=base[:1]
segs=[]
last=0
for b in bx:
    i=np.argmin(np.abs(xs-b))
    segs.append(base[last:i])
    p=base[i]
    # small cursive loop above the line
    # cursive loop (prolate trochoid): the line rises, curls back over itself and continues
    cp=np.array([(-14,0),(-2,-3),(9,-13),(15,-28),(12,-40),(5,-40),(2,-30),(4,-14),(9,-4),(16,0),(24,0)],float)
    L=spline(cp*np.array([1.0,1.0])+p,n_per=10,tension=0.5)
    segs[-1]=segs[-1][segs[-1][:,0]<p[0]-14]
    segs.append(L)
    j=np.argmin(np.abs(base[:,0]-L[-1,0]))
    last=j
segs.append(base[last:])
ground=join(*segs)
for Q in hide(ground,allmask):
    C.add(pen(Q,wmin=1.6,wmax=2.8,seed=5+len(Q),taper_in=0,taper_out=0,k0=1/8))
# mound for grief
mc=np.array([X[5]+0.42,0,0.1])
th=np.linspace(np.pi,0,60)
mound=np.array([P3([mc[0]+0.42*np.cos(t),0.22*np.sin(t),mc[2]])[0] for t in th])
C.add(pen(mound,wmin=1.6,wmax=2.4,seed=9,taper_in=5,taper_out=5))
st=P3([mc[0]+0.05,0.28,mc[2]])[0]
C.add(pen(circle(st[0],st[1],3.2,0,2*np.pi,ry=2.4),wmin=1.3,wmax=1.6,seed=10,taper_in=0,taper_out=0))
# food between the hands (vignette 2)
fx=P3([X[1]+0.02,1.22,0])[0]
C.add(pen(circle(fx[0],fx[1],4.5),wmin=1.4,wmax=1.8,seed=11,taper_in=0,taper_out=0))
for fi in range(len(figs)):
    fd=FigureDrawing(ex,fi,cons=True,skip_joints=('lHip','rHip','lWrist','rWrist','lAnkle','rAnkle','lElbow','rElbow'),min_joint_vis=0.6)
    dens=0.72 if fi==len(figs)-2 else 1.0   # the stranger slightly fainter
    draw_figure(C,fd,seed=fi,weight=0.85,cons_dens=0.55,dens=dens)
C.render(f'{OUT}/p07.png',light=(640,380,700,0.35),vignette=0.6)
print('done',time.time()-t0)
