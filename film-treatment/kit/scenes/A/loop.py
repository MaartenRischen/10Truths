"""loop.mp4: the line draws the manikin in one continuous stroke, then rockets off as the exponential."""
import os, sys, time, subprocess, numpy as np
from PIL import Image
from scene import *
from ink import Stroke, curvature, BONE
t0=time.time()
S=1.7
W,H=int(1280*S),int(720*S)
OW,OH=1280,720
FPS=24; DUR=5.0; NF=int(FPS*DUR)
spec={'camera':{'fov':22,'pos':[2.45,1.28,15],'target':[2.45,1.28,0],'near':5,'far':30},
      'figures':[fig('standTall',{'lShoulder':[-4,0,7],'rShoulder':[3,0,-7],'lElbow':[-10,0,0],'rElbow':[-8,0,0],
                                   'head':[-6,10,0],'chest':[-2,6,0],'lHip':[-2,0,3],'rHip':[1,0,-4],'rKnee':[4,0,0]},
                     rot=(0,22,0))]}
ex=extract('loopfig',spec,W,H)
fd=FigureDrawing(ex,0)
C=Canvas(W,H,ss=2,seed=11)
main=fd.main
gy=main[:,1].max(); x0=main[0,0]
wmin,wmax=fig_weight(fd.height())
# ---- build the single pen path as a list of pieces: (points, style, ink?)
pieces=[]
lead=seg((26*S,gy+0.6),(x0,gy))
pieces.append(('lead',lead,True))
# main loop with interior excursions (out and back) inserted at their nearest contour point
inter=[s_ for s_ in fd.segs if s_['role'] in ('inner','cons','sil2','joint')]
ins={}
for s_ in inter:
    Q=s_['P']
    d0=np.sqrt(((main-Q[0])**2).sum(1)); d1=np.sqrt(((main-Q[-1])**2).sum(1))
    if d1.min()<d0.min(): Q=Q[::-1]; d0=d1
    k=int(np.argmin(d0))
    ins.setdefault(k,[]).append((s_['role'],Q,float(d0.min())))
last=0
for k in sorted(ins):
    pieces.append(('main',main[last:k+1],True))
    for role,Q,dist in ins[k]:
        link=seg(main[k],Q[0]) if dist>0.5 else None
        out=join(link,Q) if link is not None else Q
        pieces.append((role,out,True))
        pieces.append(('back',out[::-1],False))
    last=k
pieces.append(('main',main[last:],True))
xa=np.linspace(main[-1,0],1400*S,3000)
lam=108*S; A=3.0*S; xs=620*S
ya=gy-np.where(xa<xs,0,A*(np.exp((xa-xs)/lam)-1))
tail=np.stack([xa,ya],1); tail=tail[tail[:,1]>-60*S]
pieces.append(('tail',tail,True))
# ---- style each piece into a Stroke and give every point a global pen time
strokes=[]; times=[]
T_lead=(0.30,0.80); T_fig=(0.80,3.90); T_tail=(3.90,4.72)
def speed_cost(P,slow=38.0):
    Q=np.asarray(P,float)
    if len(Q)<3: return np.zeros(len(Q))
    ds=np.r_[0,np.sqrt(((Q[1:]-Q[:-1])**2).sum(1))]
    kap=curvature(Q,h=3) if len(Q)>8 else np.zeros(len(Q))
    return np.cumsum(ds*(1+slow*np.clip(kap,0,0.2)))
styled=[]
for role,P,ink in pieces:
    if len(P)<2: continue
    if role=='lead': st=pen(P,wmin=2.3*S,wmax=3*S,seed=3,taper_in=0,taper_out=0)
    elif role=='tail':
        s_=arclen(P); L=s_[-1]; press=np.interp(s_,[0,L*0.55,L*0.8,L],[1.0,1.0,0.8,0.62])
        st=pen(P,wmin=2.3*S,wmax=4.2*S,seed=8,taper_in=0,taper_out=0,press=press,k0=1/60)
    elif role=='main': st=pen(P,wmin=wmin,wmax=wmax,seed=5+len(styled),taper_in=0,taper_out=0,k0=1/14,wobble=0.45)
    elif role=='back': st=Stroke(P,np.full(len(P),0.1),dens=0.0)
    elif role in ('joint',): st=pen(P,wmin=wmin*0.85,wmax=wmax*0.85,seed=9+len(styled),taper_in=0,taper_out=0,k0=1/14)
    elif role=='inner': st=pen(P,wmin=wmin*0.8,wmax=wmax*0.85,seed=9+len(styled),taper_in=4,taper_out=5,k0=1/14)
    else:
        cw=max(0.9,wmin*0.62); st=pen(P,wmin=cw,wmax=cw*1.45,seed=9+len(styled),taper_in=5,taper_out=6,dens=0.75,k0=1/14)
    styled.append((role,st,ink))
# time allocation: cost-weighted within each phase; retraces run 2.5x faster
def alloc(items,T):
    costs=[speed_cost(st.P)*(0.4 if role=='back' else 1.0) for role,st,ink in items]
    tot=sum(c[-1] for c in costs)
    t=T[0]
    for (role,st,ink),c in zip(items,costs):
        dur=(T[1]-T[0])*c[-1]/tot
        st.t=t+c/max(c[-1],1e-9)*dur
        t+=dur
alloc([x for x in styled if x[0]=='lead'],T_lead)
alloc([x for x in styled if x[0] not in ('lead','tail')],T_fig)
# the exponential accelerates: time ~ sqrt of arclength
for role,st,ink in styled:
    if role=='tail':
        s_=arclen(st.P); u=s_/s_[-1]
        st.t=T_tail[0]+(T_tail[1]-T_tail[0])*(u**0.62)
ink_strokes=[st for role,st,ink in styled if ink]
def pen_at(T):
    """Bead position and width at global time T."""
    best=None
    for role,st,ink in styled:
        if st.t[0]<=T<=st.t[-1]:
            i=int(np.searchsorted(st.t,T)); i=min(max(i,0),len(st.P)-1)
            w=st.w[i] if ink else 3.0*S
            return st.P[i],w
    return None,None
# ---- frames
os.makedirs(f'{WORK}/frames',exist_ok=True)
C.paper(light=(0.3*W,0.62*H,0.45*W,0.55),vignette=0.6)
prevT=-1
fig_c=np.array([main[:,0].mean(),main[:,1].mean()])
full_c=np.array([W/2,H/2])
def ease(x): x=np.clip(x,0,1); return x*x*(3-2*x)
for fi in range(NF):
    T=fi/FPS
    C.add(ink_strokes,t0=prevT+1e-9,t1=T)
    prevT=T
    C.beads=[]
    p,w=pen_at(T)
    if p is not None:
        grow=ease((T-0.05)/0.25) if T<0.3 else 1.0
        C.bead(p[0],p[1],max(2.9*S,w*0.8)*max(grow,0.05))
    im=C.render(None,glow=0.0)
    # camera: begins close on the figure, follows the pen a little, eases back to the full frame
    k=ease((T-3.7)/1.0)
    z=S+(1.0-S)*k
    follow=np.zeros(2)
    if p is not None and T<4.3: follow=(p-fig_c)*0.10*(1-k)
    c=fig_c*(1-k)+full_c*k+follow
    cw,ch=W/z,H/z
    cx=np.clip(c[0],cw/2,W-cw/2); cy=np.clip(c[1],ch/2,H-ch/2)
    box=(cx-cw/2,cy-ch/2,cx+cw/2,cy+ch/2)
    frame=im.resize((OW,OH),Image.LANCZOS,box=box)
    frame.save(f'{WORK}/frames/f{fi:04d}.png')
    if fi%12==0: print('frame',fi,round(time.time()-t0,1),flush=True)
out=f'{OUT}/loop.mp4'
r=subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate',str(FPS),'-i',f'{WORK}/frames/f%04d.png','-c:v','libx264','-pix_fmt','yuv420p',
                  '-crf','23','-preset','slow','-tune','grain','-movflags','+faststart',out],capture_output=True,text=True)
print(r.stderr[-500:], os.path.getsize(out) if os.path.exists(out) else 'no file')
print('done',time.time()-t0)
