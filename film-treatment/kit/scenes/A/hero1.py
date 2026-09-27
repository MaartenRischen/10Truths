import sys, time, numpy as np
from scene import *
from pull import *
from knot import band, project_ellipsoid, front_back_runs
t0=time.time()
W,H=1920,1080
S=1.5
pose={'lShoulder':[-2,0,8],'rShoulder':[-2,0,-8],'lElbow':[-8,0,0],'rElbow':[-8,0,0],'chest':[-3,4,0],'head':[-5,8,0],
      'lHip':[-3,0,3],'rHip':[2,0,-4],'rKnee':[4,0,0]}
spec={'camera':{'fov':21,'pos':[1.55,1.05,11.2],'target':[1.55,1.22,0],'near':4,'far':20},'figures':[fig('standTall',pose,rot=(0,16,0))]}
ex=extract('hero1',spec,W,H)
fd=FigureDrawing(ex,0)
m=fd.main; top=m[:,1].min(); gy=m[:,1].max(); hf=gy-top; cx=(m[:,0].min()+m[:,0].max())/2
print('fig',cx,top,gy,hf)
C=Canvas(W,H,ss=2,seed=1101)
# the handwritten line, upper right
txt="You are not broken."
size=92
tw=text_width(txt,size)
tx=W*0.665-tw/2; ty=292
polys,_=handwrite(txt,tx,ty,size)
for i,(P,role) in enumerate(chain(polys)):
    if role=='travel':
        continue
    if arclen(P)[-1]<8:
        c=P.mean(0); C.add(pen(circle(c[0],c[1],2.6),wmin=4.2,wmax=4.6,seed=950,taper_in=0,taper_out=0)); continue
    C.add(pen(P,wmin=2.3,wmax=5.0,seed=900+i,taper_in=5,taper_out=7,k0=1/7,wobble=0.3))
ctr=(cx,top+hf*0.47)
axes=(hf*0.37,hf*0.47,hf*0.37)
path,z,temp,part=pulled_thread(ctr,axes,gy,cx+W*0.46,W+30,n_knot_wraps=4.8,coil_loops=5.2,coil_amp=0.55)
rem=[]
for k,(nrm,wr,sc) in enumerate([((0.9,0.3,0.3),1.7,1.1),((-0.5,0.5,0.7),1.5,1.17),((0.1,0.2,-0.97),1.6,1.06),((0.6,-0.6,0.5),1.3,1.22)]):
    Pu=band(1500,wr,nrm,prec=0.6,phase=k*1.3)
    xy,zz=project_ellipsoid(Pu,ctr,(axes[0]*sc,axes[1]*sc,axes[2]*sc))
    rem.append((xy,zz))
fronts=[path[p] for p,f in front_back_runs(path,z) if f]+[xy[p] for xy,zz in rem for p,f in front_back_runs(xy,zz) if f]
gm=line_mask(fronts,W,H,5.5)
draw_figure(C,fd,seed=2,gaps=gm)
fmask=fig_mask(ex,0,W,H,dilate=3.0)
for j,(pidx,f) in enumerate(front_back_runs(path,z)):
    P=path[pidx]; tp=temp[pidx]; pr=part[pidx]
    if f:
        wsc=np.where(pr==2,1.3,np.where(pr==1,1.18,1.0))
        C.add(pen(P,wmin=2.3,wmax=4.0,seed=40+j,temp=tp,taper_in=0,taper_out=0,k0=1/80,wobble=0.4,press=wsc))
    else:
        for Q in hide(P,fmask):
            C.add(pen(Q,wmin=1.5,wmax=2.2,seed=40+j,temp=1.0,dens=0.42,taper_in=0,taper_out=0,k0=1/80,wobble=0.4))
for k,(xy,zz) in enumerate(rem):
    for j,(pidx,f) in enumerate(front_back_runs(xy,zz)):
        P=xy[pidx]
        if f: C.add(pen(P,wmin=2.0,wmax=3.4,seed=300+k*40+j,temp=1.0,taper_in=0,taper_out=0,k0=1/80,wobble=0.4,dens=0.9))
        else:
            for Q in hide(P,fmask): C.add(pen(Q,wmin=1.4,wmax=2.0,seed=300+k*40+j,temp=1.0,dens=0.38,taper_in=0,taper_out=0,k0=1/80,wobble=0.4))
C.add(pen(seg((0,gy+0.5),(cx-hf*0.1,gy)),wmin=2.0,wmax=2.6,seed=77,dens=0.5,taper_in=0,taper_out=0))
C.render(f'{OUT}/hero-1.png',light=(cx+120,top+hf*0.5,hf*1.5,0.55),vignette=0.62,glow=1.0)
print('done',time.time()-t0)
