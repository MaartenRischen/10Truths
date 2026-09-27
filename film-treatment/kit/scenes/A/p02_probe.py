import numpy as np, json, sys
from scene import *
W,H=1280,720
# figure's right arm raised forward, elbow bent, hand presented thumb-up
ov={'rShoulder':[-62,0,-14],'rElbow':[-58,0,0],'rWrist':[0,0,0],'lShoulder':[0,0,6]}
ov.update(json.loads(sys.argv[1]) if len(sys.argv)>1 else {})
cam=json.loads(sys.argv[2]) if len(sys.argv)>2 else {'fov':26,'pos':[-1.6,1.35,1.2],'target':[-0.35,1.25,0.45]}
spec={'camera':{**cam,'near':0.05,'far':10},'figures':[fig('stand',ov,rot=(0,0,0))]}
ex=extract('p02probe',spec,W,H)
from PIL import Image
L=np.array(Image.open(f'{WORK}/p02probe_labels.png'))
rng=np.random.RandomState(1); cols=rng.randint(60,255,(32,3)); vis=np.zeros(L.shape[:2]+(3,),np.uint8)
m=L[...,0]>0; vis[m]=cols[L[...,1][m]]
Image.fromarray(vis).resize((640,360)).save(f'{WORK}/p02probe.png')
# print wrist screen pos
p,_=ex.project(ex.jpos(0,'rWrist')[None]); print('wrist',p)
