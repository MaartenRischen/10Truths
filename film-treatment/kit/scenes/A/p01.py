import sys, numpy as np
from scene import *
W,H=1280,720
S=float(sys.argv[1]) if len(sys.argv)>1 else 1.0   # scale factor (1.5 for 1920)
W,H=int(W*S),int(H*S)
spec={'camera':{'fov':22,'pos':[2.45,1.28,15],'target':[2.45,1.28,0],'near':5,'far':30},
      'figures':[fig('standTall',{'lShoulder':[-4,0,7],'rShoulder':[3,0,-7],'lElbow':[-10,0,0],'rElbow':[-8,0,0],
                                   'head':[-6,10,0],'chest':[-2,6,0],'lHip':[-2,0,3],'rHip':[1,0,-4],'rKnee':[4,0,0]},
                     rot=(0,22,0))]}
ex=extract('p01',spec,W,H)
fd=FigureDrawing(ex,0)
C=Canvas(W,H,ss=2,seed=11)
main=fd.main
gy=main[:,1].max()
x0=main[0,0]
# ground in from the left edge to the foot, figure loop, then on to the right and up exponentially
lead=seg((-20*S,gy+0.6),(x0,gy))
xa=np.linspace(main[-1,0],1400*S,3000)
lam=108*S; A=3.0*S; xs=620*S
ya=gy-np.where(xa<xs,0,A*(np.exp((xa-xs)/lam)-1))
tail=np.stack([xa,ya],1)
tail=tail[tail[:,1]>36*S]
wmin,wmax=fig_weight(fd.height())
# lead-in ground line
C.add(pen(lead,wmin=2.3*S,wmax=3*S,seed=3,taper_in=0,taper_out=0))
draw_figure(C,fd,seed=5,main_taper=False)
# the exponential: thinner as it accelerates
s=arclen(tail); L=s[-1]
press=np.interp(s,[0,L*0.55,L*0.8,L],[1.0,1.0,0.8,0.62])
st=pen(tail,wmin=2.3*S,wmax=4.2*S,seed=8,taper_in=0,taper_out=0,press=press,k0=1/60)
C.add(st)
C.bead(st.P[-1,0],st.P[-1,1],max(3.2*S,st.w[-1]*0.95))
C.render(f'{OUT}/p01.png' if S==1 else f'{WORK}/p01_big.png',light=(0.3*W,0.62*H,0.45*W,0.55),vignette=0.6)
