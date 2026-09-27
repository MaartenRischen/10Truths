import sys, time, numpy as np
from scene import *
from pull import *
t0=time.time()
S=float(sys.argv[1]) if len(sys.argv)>1 else 1.0
W,H=int(1280*S),int(720*S)
pose={'lShoulder':[-2,0,7],'rShoulder':[-2,0,-7],'lElbow':[-6,0,0],'rElbow':[-6,0,0],'chest':[-3,0,0],'head':[-4,0,0],
      'lHip':[-2,0,3],'rHip':[1,0,-3]}
spec={'camera':{'fov':21,'pos':[1.25,1.1,11],'target':[1.25,1.32,0],'near':4,'far':20},'figures':[fig('standTall',pose,rot=(0,14,0))]}
ex=extract('p13',spec,W,H)
fd=FigureDrawing(ex,0)
m=fd.main; top=m[:,1].min(); gy=m[:,1].max(); hf=gy-top; cx=(m[:,0].min()+m[:,0].max())/2
print('fig',cx,top,gy,hf)
C=Canvas(W,H,ss=2,seed=131)
# handwriting
txt="You are not broken."
size=62*S
tw=text_width(txt,size)
polys,_=handwrite(txt,W/2-tw/2,118*S,size)
for i,P in enumerate(polys):
    if arclen(P)[-1]<6*S:   # the full stop: a proper dot
        c=P.mean(0); C.add(pen(circle(c[0],c[1],1.6*S),wmin=2.6*S,wmax=3.0*S,seed=950,taper_in=0,taper_out=0)); continue
    C.add(pen(P,wmin=1.6*S,wmax=3.4*S,seed=900+i,taper_in=4,taper_out=5,k0=1/5,wobble=0.25))
# the pulled knot
ctr=(cx,top+hf*0.47)
path,z,temp,part=pulled_thread(ctr,(hf*0.36,hf*0.46,hf*0.36),gy,cx+W*0.44,W+20,n_knot_wraps=4.6,coil_loops=4.2)
from knot import band, project_ellipsoid
# loosened remnants of the cocoon (other orientations), about to follow
rem=[]
for k,(nrm,wr,sc) in enumerate([((0.9,0.3,0.3),1.6,1.12),((-0.5,0.5,0.7),1.4,1.2),((0.1,0.2,-0.97),1.5,1.08)]):
    Pu=band(1100,wr,nrm,prec=0.6,phase=k*1.3)
    xy,zz=project_ellipsoid(Pu,ctr,(hf*0.36*sc,hf*0.46*sc,hf*0.36*sc))
    rem.append((xy,zz))
fronts=[path[p] for p,f in front_back_runs(path,z) if f]+[xy[p] for xy,zz in rem for p,f in front_back_runs(xy,zz) if f]
gm=line_mask(fronts,W,H,3.8*S)
draw_figure(C,fd,seed=2,gaps=gm)
fmask=fig_mask(ex,0,W,H,dilate=2.0*S)
for j,(pidx,f) in enumerate(front_back_runs(path,z)):
    P=path[pidx]; tp=temp[pidx]
    if f:
        pr=part[pidx]
        wsc=np.where(pr==2,1.35,np.where(pr==1,1.15,1.0))
        C.add(pen(P,wmin=1.6*S,wmax=2.8*S,seed=40+j,temp=tp,taper_in=0,taper_out=0,k0=1/60,wobble=0.3,press=wsc))
    else:
        for Q in hide(P,fmask):
            ii=[np.argmin(((path-q)**2).sum(1)) for q in Q[::max(1,len(Q)//8)]]
            C.add(pen(Q,wmin=1.1*S,wmax=1.6*S,seed=40+j,temp=float(np.mean(temp[ii])),dens=0.45,taper_in=0,taper_out=0,k0=1/60,wobble=0.3))
for k,(xy,zz) in enumerate(rem):
    for j,(pidx,f) in enumerate(front_back_runs(xy,zz)):
        P=xy[pidx]
        if f: C.add(pen(P,wmin=1.4*S,wmax=2.4*S,seed=300+k*40+j,temp=1.0,taper_in=0,taper_out=0,k0=1/60,wobble=0.3,dens=0.9))
        else:
            for Q in hide(P,fmask): C.add(pen(Q,wmin=1.0*S,wmax=1.5*S,seed=300+k*40+j,temp=1.0,dens=0.4,taper_in=0,taper_out=0,k0=1/60,wobble=0.3))
# the old ground to the left, faint
C.add(pen(seg((0,gy+0.5),(cx,gy)),wmin=1.4*S,wmax=1.8*S,seed=77,dens=0.55,taper_in=0,taper_out=0))
C.render(f'{OUT}/p13.png',light=(cx,top+hf*0.5,hf*1.2,0.5),vignette=0.6,glow=0.9)
print('done',time.time()-t0)
