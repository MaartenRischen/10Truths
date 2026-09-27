import sys, numpy as np
from scene import *
W,H=1280,720
spec={'camera':{'fov':22,'pos':[-2.95,1.64,0.56],'target':[0,1.64,0.56],'near':0.5,'far':12},
      'figures':[fig('stand',{'rShoulder':[-78,0,-4],'rElbow':[-36,0,0],'rWrist':[-28,90,0],'head':[-2,0,0],'chest':[-3,0,0],
                              'lShoulder':[-8,0,4],'lElbow':[-12,0,0]})]}
ex=extract('p02',spec,W,H)
fd=FigureDrawing(ex,0,skip_joints=('lHip','rHip'))
C=Canvas(W,H,ss=2,seed=21)
# hand region: part 9 = right hand (wrist group)
hand=(ex.part==9)&(ex.fig==1)
ys,xs=np.where(hand); xs=xs/2; ys=ys/2
G=np.array([np.percentile(xs,40),np.percentile(ys,38)])
hlen=xs.max()-xs.min()
print('grip',G,'hand len',hlen,'fig h',fd.height())
hm=fig_mask(ex,0,W,H,dilate=2.0)
def tool_lines(kind,G,ang,u):
    c,s=np.cos(ang),np.sin(ang)
    R=lambda P: np.stack([G[0]+(c*P[:,0]-s*P[:,1])*u,G[1]+(s*P[:,0]+c*P[:,1])*u],1)
    L=[]
    if kind=='axe':
        t=np.linspace(-np.pi/2,1.5*np.pi,240)
        # almond: pointed top (y=-1), round butt (y=+0.35)
        yy=-0.4+0.75*np.sin(t); xx=0.36*np.cos(t)*(0.35+0.65*(yy+1)/1.35)**0.9
        P=np.stack([xx,yy],1)
        L.append(R(P))
        for (a,b,r,a0,sw) in [(-0.1,-0.75,0.13,0.2,2.2),(0.12,-0.45,0.12,2.4,2.0),(-0.12,-0.2,0.12,0.4,2.0),(0.1,0.02,0.1,2.6,1.8)]:
            L.append(R(circle(a,b,r,a0,sw)))
    elif kind=='hammer':
        L.append(R(np.array([[-0.06,0.9],[-0.06,-1.45]]))); L.append(R(np.array([[0.06,0.9],[0.06,-1.45]])))
        L.append(R(circle(0,0.9,0.06,0,np.pi)))
        L.append(R(np.array([[-0.42,-1.42],[0.34,-1.42],[0.34,-1.72],[-0.42,-1.72],[-0.42,-1.42]])))
        L.append(R(np.array([[0.34,-1.48],[0.55,-1.44],[0.62,-1.6],[0.34,-1.68]])))
    elif kind=='pen':
        L.append(R(np.array([[-0.06,-1.25],[-0.06,0.62],[0.0,0.86],[0.06,0.62],[0.06,-1.25],[-0.06,-1.25]])))
        L.append(R(np.array([[-0.06,-0.85],[0.06,-0.85]])))
        L.append(R(np.array([[0.06,-1.12],[0.11,-1.1],[0.11,-0.7]])))
    elif kind=='chip':
        s2=0.36; y0=-0.18
        L.append(R(rrect(-s2,y0-2*s2,2*s2,2*s2,0.03)))
        L.append(R(rrect(-s2*0.45,y0-1.45*s2,s2*0.9,s2*0.9,0.02)))
        for k in range(5):
            o=-s2+s2*2*(k+0.5)/5
            L.append(R(np.array([[o,y0-2*s2],[o,y0-2*s2-0.09]])))
            yy=y0-2*s2+s2*2*(k+0.5)/5
            L.append(R(np.array([[-s2,yy],[-s2-0.09,yy]])))
            L.append(R(np.array([[s2,yy],[s2+0.09,yy]])))
        L.append(R(np.array([[-s2*0.45,y0-1.2*s2],[-s2*0.75,y0-1.2*s2],[-s2*0.75,y0-0.7*s2]])))
        L.append(R(np.array([[s2*0.45,y0-0.8*s2],[s2*0.72,y0-0.8*s2],[s2*0.72,y0-1.5*s2]])))
    return L
u=hlen*1.45
# the chip sits in front of its ghosts: hide ghost lines inside the chip body
from PIL import Image as _I, ImageDraw as _D
_im=_I.new('L',(W,H),0)
_body=tool_lines('chip',G,0.02,u)[0]
_D.Draw(_im).polygon([tuple(p) for p in _body],fill=255)
chip_mask=np.asarray(_im)>0
from scipy import ndimage as _ndi
chip_mask=_ndi.binary_dilation(chip_mask,iterations=3)
for kind,ang,d,w,seed in [('axe',-0.95,0.34,1.6,1),('hammer',-0.6,0.36,1.7,2),('pen',-0.3,0.46,1.8,3)]:
    for P in tool_lines(kind,G,ang,u):
        for Q in hide(jitter(P,0.7,60,seed),hm|chip_mask):
            C.add(pen(Q,wmin=w*0.8,wmax=w*1.3,dens=d,seed=seed*7+len(Q),taper_in=6,taper_out=6,k0=1/30))
chip=[]
for P in tool_lines('chip',G,0.02,u):
    chip+=hide(jitter(P,0.4,60,9),hm)
for Q in chip:
    C.add(pen(Q,wmin=2.0,wmax=3.0,seed=91+len(Q),taper_in=4,taper_out=4,k0=1/16))
draw_figure(C,fd,seed=4)
C.render(f'{OUT}/p02.png',light=(G[0]-40,G[1],420,0.6),vignette=0.6)
