import sys, time, numpy as np
from scene import *
t0=time.time()
S=float(sys.argv[1]) if len(sys.argv)>1 else 1.0
W,H=int(1280*S),int(720*S)
cam={'fov':24,'pos':[0.55,1.3,9.0],'target':[0.55,1.12,0],'near':1,'far':20}
main_pose={'lShoulder':[-4,0,7],'rShoulder':[-4,0,-7],'lElbow':[-8,0,0],'rElbow':[-8,0,0],'head':[4,-10,0],'chest':[0,-6,0],'lHip':[-2,0,3],'rHip':[1,0,-3]}
MAIN=fig('stand',main_pose,pos=(-0.55,0,0),rot=(0,24,0))
ex0=extract('p14a',{'camera':cam,'figures':[MAIN]},W,H)
Mc=ex0.jmat(0,'chest'); T=(Mc@np.array([0,0.26,0.14,1]))[:3]
print('chest target',T)
# the covering hand: an arm reaching from outside the frame (upper left, near camera), palm toward the chest
d=np.array([0.95,-0.42,-0.55]); d/=np.linalg.norm(d)
s=1.9; reach=(0.36+0.31+0.12)*s; gap=0.17
yaw=np.degrees(np.arctan2(d[0],d[2])); pitch=np.degrees(np.arcsin(-d[1]))
ry=np.radians(yaw)
Ry=np.array([[np.cos(ry),0,np.sin(ry)],[0,1,0],[-np.sin(ry),0,np.cos(ry)]])
sh_local=np.array([-0.245,1.575,0])*s
O=T-d*(reach+gap)-Ry@sh_local
hand_pose={'rShoulder':[-(90-pitch),0,0],'rElbow':[-4,0,0],'rWrist':[-62,90,0]}
FRIEND=fig('walk',{'head':[2,-8,0],'lShoulder':[10,0,8],'rShoulder':[-14,0,-8]},pos=(2.55,0,-1.15),rot=(0,-62,0))
spec={'camera':cam,'figures':[MAIN,FRIEND]}
ex=extract('p14',spec,W,H)
fdM=FigureDrawing(ex,0); fdF=FigureDrawing(ex,1)
# the covering hand: an isolated arm, placed in 2D so it enters from outside the frame
exA=extract('p14hand',{'camera':{'fov':30,'pos':[-3.2,1.58,0.5],'target':[0,1.58,0.5],'near':0.5,'far':8},
        'figures':[fig('stand',{'rShoulder':[-90,0,-2],'rElbow':[-6,0,0],'rWrist':[-8,90,0]},show=['rShoulder','rElbow','rWrist'])]},1280,720)
fdA=FigureDrawing(exA,0,cons=False,skip_joints=())
hm_=(exA.part==9)&(exA.fig==1); yy_,xx_=np.where(hm_); palm=np.array([xx_.mean()/2,yy_.mean()/2])
shp=exA.project(exA.jpos(0,'rShoulder')[None])[0][0]
m=fdM.main; gy=m[:,1].max()
C=Canvas(W,H,ss=2,seed=141)
def P3(X): return ex.project(np.atleast_2d(X))[0]
occ_main=fig_mask(ex,0,W,H,dilate=3)
occ_friend=fig_mask(ex,1,W,H,dilate=3)
ap=P3(T)[0]
theta=np.radians(9); k_=1.5*S
cth,sth=np.cos(theta),np.sin(theta)
tipx=xx_.max()/2; tip_off=(tipx-palm[0])*k_
dirv=np.array([cth,sth])
target=ap-dirv*(tip_off+24*S)+np.array([0,-2*S])
def TA(P):
    Q=(np.asarray(P)-palm)*k_
    return np.stack([cth*Q[:,0]-sth*Q[:,1],sth*Q[:,0]+cth*Q[:,1]],1)+target
arm_polys=[(TA(sg['P']),sg['role']) for sg in fdA.segs]
print('shoulder at',TA(shp[None]))
occ_hand=line_mask([p for p,_ in arm_polys],W,H,8*S)
from scipy import ndimage as ndi
from PIL import Image, ImageDraw
im=Image.new('L',(W,H),0)
for pP,role in arm_polys:
    if role=='main' and len(pP)>3: ImageDraw.Draw(im).polygon([tuple(q) for q in pP],fill=255)
occ_hand=occ_hand|(np.asarray(im)>0)
def lines3(pts,w=(1.7,2.6),dens=1.0,seed=0,occ=None,taper=5):
    Q=P3(pts)
    for R in (hide(Q,occ) if occ is not None else [Q]):
        C.add(pen(R,wmin=w[0]*S,wmax=w[1]*S,seed=seed,dens=dens,taper_in=taper,taper_out=taper,k0=1/30))
occ_all=occ_main|occ_friend|occ_hand
# floor line and the back wall's base
C.add(pen(seg((0,gy+1),(W,gy)),wmin=1.5*S,wmax=1.9*S,seed=2,taper_in=80,taper_out=80,dens=0.9))
# the door, open, in the back wall
dx0,dx1,dz,dh=2.05,3.0,-1.2,2.2
lines3(np.array([[dx0,0,dz],[dx0,dh,dz],[dx1,dh,dz],[dx1,0,dz]]),seed=3,occ=occ_friend|occ_main)
ang=np.radians(70)
hinge=np.array([dx1,0,dz]); leaf=np.array([-np.cos(ang),0,np.sin(ang)])*(dx1-dx0)
door=np.array([hinge,hinge+[0,dh,0],hinge+leaf+[0,dh,0],hinge+leaf,hinge])
lines3(door,seed=4,occ=occ_friend|occ_main)
knob=hinge+leaf*0.88+[0,1.0,0]; kp=P3(knob)[0]
C.add(pen(circle(kp[0],kp[1],2.6*S),wmin=1.4*S,wmax=1.8*S,seed=5,taper_in=0,taper_out=0))
# light through the doorway
from PIL import Image, ImageDraw
im=Image.new('L',(W,H),0); ImageDraw.Draw(im).polygon([tuple(p) for p in P3(np.array([[dx0,0,dz],[dx0,dh,dz],[dx1,dh,dz],[dx1,0,dz]]))],fill=255)
dm=np.asarray(im,np.float32)/255.0
from scipy import ndimage as ndi
C.fill(ndi.gaussian_filter(dm,2)*(1-ndi.gaussian_filter(fig_mask(ex,1,W,H).astype(np.float32),0.7)),strength=0.09)
# the window, shutters opening
wx0,wx1,wy0,wy1=0.55,1.3,1.35,2.05
win=np.array([[wx0,wy0,dz],[wx1,wy0,dz],[wx1,wy1,dz],[wx0,wy1,dz],[wx0,wy0,dz]])
lines3(win,seed=6,occ=occ_all)
lines3(np.array([[(wx0+wx1)/2,wy0,dz],[(wx0+wx1)/2,wy1,dz]]),w=(1.2,1.6),seed=7,dens=0.8,occ=occ_all)
for side,hx in ((-1,wx0),(1,wx1)):
    a=np.radians(55); lw=(wx1-wx0)/2
    tip=np.array([hx+side*lw*np.cos(a),0,dz+lw*np.sin(a)])
    sh=np.array([[hx,wy0,dz],[tip[0],wy0,tip[2]],[tip[0],wy1,tip[2]],[hx,wy1,dz]])
    lines3(sh,seed=8+side,occ=occ_all)
im=Image.new('L',(W,H),0); ImageDraw.Draw(im).polygon([tuple(p) for p in P3(win[:4])],fill=255)
C.fill(ndi.gaussian_filter(np.asarray(im,np.float32)/255.0,2),strength=0.07)
# figures
draw_figure(C,fdM,seed=3,gaps=occ_hand)
for i,(pP,role) in enumerate(arm_polys):
    w0,w1=(2.6,4.6) if role in ('main','sil2','joint') else (1.4,2.2)
    C.add(pen(pP,wmin=w0*S,wmax=w1*S,seed=600+i,taper_in=8,taper_out=12,k0=1/30))
# the friend: still being drawn -- the line has reached most of the contour
fstrokes=draw_figure(C,fdF,seed=5,add=False)
main_st=fstrokes[0]
cut=0.86
keep=main_st.t<=cut
from ink import Stroke
part=Stroke(main_st.P[keep],main_st.w[keep],temp=0.0,dens=main_st.dens[keep],t=main_st.t[keep])
part.w[-12:]=np.maximum(part.w[-12:],2.4*S)
C.add(part)
for st in fstrokes[1:]:
    if st.P[:,1].mean()<main_st.P[keep][:,1].max(): C.add(st)
C.bead(part.P[-1,0],part.P[-1,1],3.3*S)
# the alarm in the chest: cooling
for r_,tp in [(8.0,0.45),(5.2,0.75),(2.6,0.95),(0.8,1.0)]:
    C.add(pen(circle(ap[0],ap[1],r_*S),wmin=2.6*S,wmax=3.0*S,seed=int(r_*10),temp=tp,taper_in=0,taper_out=0))
C.render(f'{OUT}/p14.png',light=(ap[0],ap[1],420*S,0.45),vignette=0.6,glow=0.9)
print('done',time.time()-t0)
