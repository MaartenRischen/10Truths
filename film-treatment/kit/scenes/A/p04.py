import sys, numpy as np
from scene import *
W,H=1280,720
pose={'rShoulder':[-22,50,-8],'rElbow':[-118,0,0],'rWrist':[0,0,0],'chest':[14,0,0],'head':[34,10,0],
      'lShoulder':[-2,0,5],'lElbow':[-6,0,0],'lHip':[-2,0,3],'rHip':[1,0,-3]}
spec={'camera':{'fov':21,'pos':[0.35,2.3,8.6],'target':[0.02,0.93,0],'near':3,'far':15},
      'figures':[fig('stand',pose,rot=(0,-8,0))]}
ex=extract('p04',spec,W,H)
fd=FigureDrawing(ex,0)
C=Canvas(W,H,ss=2,seed=41)
m=fd.main
hf=fd.height(); top=m[:,1].min(); bot=m[:,1].max(); cx=(m[:,0].min()+m[:,0].max())/2
print('h',hf,top,bot,cx)
# crooked frame
def frame(cx,cy,w,h,ang,skew=0.0,seed=0):
    c,s=np.cos(ang),np.sin(ang)
    pts=np.array([[-w/2,-h/2],[w/2+skew,-h/2],[w/2,h/2],[-w/2-skew*0.3,h/2]])
    R=lambda p: np.stack([cx+c*p[:,0]-s*p[:,1],cy+s*p[:,0]+c*p[:,1]],1)
    P=R(pts)
    # overshooting corners: each side drawn a little past the corners
    sides=[]
    for i in range(4):
        a,b=P[i],P[(i+1)%4]; d=(b-a)/np.linalg.norm(b-a)
        sides.append(seg(a-d*(10+4*i),b+d*(14-2*i)))
    return sides
fcx,fcy=cx+6,378
ang=np.radians(-6.5)
sides=frame(fcx,fcy,460,560,ang,skew=16)+frame(fcx+3,fcy+2,422,522,np.radians(-5.4),skew=10)
# hanging string from a nail
c_,s_a=np.cos(ang),np.sin(ang)
R=lambda p: np.array([fcx+c_*p[0]-s_a*p[1],fcy+s_a*p[0]+c_*p[1]])
nail=np.array([fcx+10,fcy-280-60])
sides+= [join(seg(R((-150,-280)),nail),seg(nail,R((150,-280))))]
fmask=fig_mask(ex,0,W,H,dilate=3)
for i,S in enumerate(sides):
    for Q in hide(jitter(S,1.0,70,i),fmask):
        C.add(pen(Q,wmin=2.0 if i<4 else 1.4,wmax=2.8 if i<4 else 1.9,seed=50+i,taper_in=8,taper_out=12,k0=1/30,dens=1.0 if i<4 else (0.7 if i<8 else 0.8)))
C.add(pen(circle(nail[0],nail[1],4.0),wmin=2.2,wmax=2.6,seed=3,taper_in=0,taper_out=0))
# the X, scribbled from the right hand over the chest
hm=(ex.part==9)&(ex.fig==1)
ys,xs=np.where(hm); xs=xs/2; ys=ys/2
tip=np.array([xs.max(),ys[np.argmax(xs)]])
chest=ex.project((ex.jmat(0,'chest')@np.array([0.03,0.24,0.1,1]))[:3][None])[0][0]
print('tip',tip,'chest',chest)
rng=np.random.RandomState(4)
w2,h2=54,60
def hatch(a,b,n=4,amp=6):
    pts=[]
    for k in range(n):
        o=rng.normal(0,amp,2)
        pts+= [a+o, b+rng.normal(0,amp,2)]
    return pts
c=chest+np.array([10,22])
A1,B1=c+[-w2,-h2],c+[w2,h2]
A2,B2=c+[w2,-h2],c+[-w2,h2]
pts=[tip]+hatch(A1,B1,4,9)+hatch(A2,B2,4,9)
# connect with tight turns (scribble): polyline through points, slightly rounded at turns
xpath=spline(pts,n_per=18,tension=0.28)
s_=arclen(xpath); L=s_[-1]
st=pen(xpath,wmin=2.6,wmax=5.0,seed=7,taper_in=4,taper_out=0,k0=1/8,wobble=1.2,dens=np.interp(s_,[0,L],[0.85,1.0]))
xm=line_mask([xpath],W,H,4)
draw_figure(C,fd,seed=8,gaps=xm)
C.add(st)
C.bead(st.P[-1,0],st.P[-1,1],3.4)
C.render(f'{OUT}/p04.png',light=(fcx,fcy,380,0.5),vignette=0.62)
