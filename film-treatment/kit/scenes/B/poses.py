# Direction B pose library (same conventions as kit/mannequin.js POSES: Euler degrees [x,y,z]).
# Shoulder X negative = arm forward; shoulder Z + (left) / - (right) = sideways raise.
# Elbow X negative = bend forward. Hip X negative = thigh forward; knee X positive = bend back.
# Chest X positive = lean forward; head X positive = look down.
import json, hashlib, os, subprocess

BASE = {
  'stand': {},
  'standTall': {'chest': [-3, 0, 0], 'head': [-4, 0, 0]},
  'walk': {'lHip': [-22, 0, 3], 'lKnee': [10, 0, 0], 'lAnkle': [4, 0, 0], 'rHip': [16, 0, -3], 'rKnee': [26, 0, 0], 'rAnkle': [-14, 0, 0], 'lShoulder': [16, 0, 7], 'rShoulder': [-18, 0, -7], 'lElbow': [-12, 0, 0], 'rElbow': [-24, 0, 0], 'chest': [4, 0, 0], 'head': [-2, 0, 0]},
  'slump': {'chest': [18, 0, 0], 'head': [22, 0, 0], 'lShoulder': [-4, 0, 4], 'rShoulder': [-4, 0, -4], 'lElbow': [-12, 0, 0], 'rElbow': [-12, 0, 0]},
  'sitChair': {'lHip': [-88, 0, 4], 'rHip': [-88, 0, -4], 'lKnee': [90, 0, 0], 'rKnee': [90, 0, 0], 'lAnkle': [-2, 0, 0], 'rAnkle': [-2, 0, 0], 'chest': [6, 0, 0], 'lShoulder': [-28, 0, 8], 'rShoulder': [-28, 0, -8], 'lElbow': [-58, 0, 0], 'rElbow': [-58, 0, 0]},
  'sitPhone': {'lHip': [-86, 0, 5], 'rHip': [-86, 0, -5], 'lKnee': [88, 0, 0], 'rKnee': [88, 0, 0], 'chest': [22, 0, 0], 'head': [28, 0, 0], 'lShoulder': [-20, -10, 12], 'rShoulder': [-20, 10, -12], 'lElbow': [-100, 0, -10], 'rElbow': [-100, 0, 10], 'lWrist': [0, 0, 10], 'rWrist': [0, 0, -10]},
  'sitHugKnees': {'lHip': [-120, 0, 6], 'rHip': [-120, 0, -6], 'lKnee': [140, 0, 0], 'rKnee': [140, 0, 0], 'chest': [30, 0, 0], 'head': [30, 0, 0], 'lShoulder': [-58, 0, 14], 'rShoulder': [-58, 0, -14], 'lElbow': [-40, -30, 0], 'rElbow': [-40, 30, 0]},
  'sitCrossFire': {'lHip': [-80, 0, 38], 'rHip': [-80, 0, -38], 'lKnee': [128, 0, 0], 'rKnee': [128, 0, 0], 'lAnkle': [0, 0, -20], 'rAnkle': [0, 0, 20], 'chest': [10, 0, 0], 'head': [8, 0, 0], 'lShoulder': [-40, 0, 10], 'rShoulder': [-40, 0, -10], 'lElbow': [-55, 0, 0], 'rElbow': [-55, 0, 0]},
  'kneel': {'lHip': [-8, 0, 3], 'rHip': [-8, 0, -3], 'lKnee': [118, 0, 0], 'rKnee': [118, 0, 0], 'lAnkle': [40, 0, 0], 'rAnkle': [40, 0, 0], 'chest': [16, 0, 0], 'head': [24, 0, 0], 'lShoulder': [-12, 0, 6], 'rShoulder': [-12, 0, -6], 'lElbow': [-30, 0, 0], 'rElbow': [-30, 0, 0]},
  'reachUp': {'lShoulder': [-160, 0, 8], 'lElbow': [-10, 0, 0], 'rShoulder': [-8, 0, -8], 'chest': [-6, 0, 0], 'head': [-20, 0, 0]},
  'carry': {'lShoulder': [-150, 0, 20], 'lElbow': [-40, 0, 0], 'rShoulder': [-150, 0, -20], 'rElbow': [-40, 0, 0], 'head': [-4, 0, 0]},
  'handToChest': {'rShoulder': [-40, 0, -20], 'rElbow': [-110, -30, 0], 'chest': [8, 0, 0], 'head': [18, 0, 0]},
  'headInHands': {'lHip': [-86, 0, 8], 'rHip': [-86, 0, -8], 'lKnee': [88, 0, 0], 'rKnee': [88, 0, 0], 'chest': [40, 0, 0], 'head': [34, 0, 0], 'lShoulder': [-40, 0, -4], 'rShoulder': [-40, 0, 4], 'lElbow': [-138, 0, 0], 'rElbow': [-138, 0, 0], 'lWrist': [-20, 0, 0], 'rWrist': [-20, 0, 0]},
  'lieCurl': {'lHip': [-80, 0, 0], 'rHip': [-70, 0, 0], 'lKnee': [100, 0, 0], 'rKnee': [90, 0, 0], 'chest': [26, 0, 0], 'head': [20, 0, 0], 'lShoulder': [-60, 0, 0], 'rShoulder': [-70, 0, 0], 'lElbow': [-90, 0, 0], 'rElbow': [-80, 0, 0]},
}

POSES = dict(BASE)

def pose(name):
    return POSES[name]

def define(name, p):
    POSES[name] = p
    return name

def merged(base, **over):
    d = json.loads(json.dumps(POSES[base]))
    for k, v in over.items():
        d[k] = v
    return d


def glb_for(name, kit_dir, cache_dir):
    """Export (cached) GLB for pose `name`; returns path."""
    p = POSES[name]
    js = json.dumps(p, sort_keys=True)
    h = hashlib.md5(js.encode()).hexdigest()[:10]
    os.makedirs(cache_dir, exist_ok=True)
    out = os.path.join(cache_dir, f'{name}-{h}.glb')
    if not os.path.exists(out):
        r = subprocess.run(['node', 'export-glb.mjs', 'json:' + js, out], cwd=kit_dir, capture_output=True, text=True)
        if not os.path.exists(out):
            raise RuntimeError('glb export failed: ' + r.stdout + r.stderr)
    return out

# ---------------- Direction B custom poses ----------------
# ground sitting, knees up, elbows resting on knees, hands out to the fire
POSES['sitKnees'] = {'lHip': [-130, 0, 10], 'rHip': [-130, 0, -10], 'lKnee': [87, 0, 0], 'rKnee': [87, 0, 0],
    'lAnkle': [43, 0, -6], 'rAnkle': [43, 0, 6], 'chest': [12, 0, 0], 'head': [10, 0, 0],
    'lShoulder': [-55, 0, 6], 'rShoulder': [-55, 0, -6], 'lElbow': [-45, 0, 0], 'rElbow': [-45, 0, 0],
    'lWrist': [10, 0, 0], 'rWrist': [10, 0, 0]}
# hugging knees on the ground
POSES['sitHug'] = {'lHip': [-143, 0, 6], 'rHip': [-143, 0, -6], 'lKnee': [112, 0, 0], 'rKnee': [112, 0, 0],
    'lAnkle': [31, 0, 0], 'rAnkle': [31, 0, 0], 'chest': [22, 0, 0], 'head': [22, 0, 0],
    'lShoulder': [-60, -50, -4], 'rShoulder': [-60, 50, 4], 'lElbow': [-70, 0, 0], 'rElbow': [-70, 0, 0]}
# legs out, leaning back on both hands
POSES['sitLean'] = {'lHip': [-88, 0, 4], 'rHip': [-120, 0, -6], 'lKnee': [2, 0, 0], 'rKnee': [66, 0, 0],
    'lAnkle': [-6, 0, 0], 'rAnkle': [54, 0, 0], 'chest': [-20, 0, 0], 'head': [-8, 0, 0],
    'lShoulder': [62, 0, 14], 'rShoulder': [62, 0, -14], 'lElbow': [0, 0, 0], 'rElbow': [0, 0, 0],
    'lWrist': [-50, 0, 0], 'rWrist': [-50, 0, 0]}
# sitting, right arm reaching to the fire with a stick
POSES['sitPoke'] = {'lHip': [-130, 0, 12], 'rHip': [-125, 0, -8], 'lKnee': [87, 0, 0], 'rKnee': [80, 0, 0],
    'lAnkle': [43, 0, -6], 'rAnkle': [40, 0, 6], 'chest': [18, -10, 0], 'head': [16, -6, 0],
    'lShoulder': [-50, 0, 8], 'rShoulder': [-72, 0, -6], 'lElbow': [-50, 0, 0], 'rElbow': [-14, 0, 0],
    'lWrist': [10, 0, 0], 'rWrist': [0, 0, 0]}
# kneeling upright, hands toward the fire
POSES['kneelWarm'] = {'lHip': [-6, 0, 4], 'rHip': [-6, 0, -4], 'lKnee': [96, 0, 0], 'rKnee': [96, 0, 0],
    'lAnkle': [84, 0, 0], 'rAnkle': [84, 0, 0], 'chest': [10, 0, 0], 'head': [12, 0, 0],
    'lShoulder': [-58, 0, 10], 'rShoulder': [-58, 0, -10], 'lElbow': [-30, 0, 0], 'rElbow': [-30, 0, 0]}
# walking in carrying a bundle on the right shoulder
POSES['walkCarry'] = {'lHip': [-20, 0, 3], 'lKnee': [8, 0, 0], 'lAnkle': [4, 0, 0], 'rHip': [16, 0, -3], 'rKnee': [26, 0, 0], 'rAnkle': [-14, 0, 0],
    'lShoulder': [18, 0, 8], 'lElbow': [-14, 0, 0], 'rShoulder': [-160, 0, -24], 'rElbow': [-112, 0, 0], 'chest': [4, 0, 4], 'head': [-2, 0, -4]}
POSES['walkB'] = {'rHip': [-22, 0, -3], 'rKnee': [10, 0, 0], 'rAnkle': [4, 0, 0], 'lHip': [16, 0, 3], 'lKnee': [26, 0, 0], 'lAnkle': [-14, 0, 0],
    'rShoulder': [16, 0, -7], 'lShoulder': [-18, 0, 7], 'rElbow': [-12, 0, 0], 'lElbow': [-24, 0, 0], 'chest': [4, 0, 0], 'head': [-2, 0, 0]}
POSES['standLookUp'] = {'chest': [-6, 0, 0], 'head': [-28, 0, 0], 'lShoulder': [0, 0, 14], 'rShoulder': [0, 0, -14], 'lElbow': [-8, 0, 0], 'rElbow': [-8, 0, 0]}
POSES['standOpen'] = {'chest': [-2, 0, 0], 'head': [-6, 8, 0], 'lShoulder': [2, 0, 9], 'rShoulder': [2, 0, -9], 'lElbow': [-10, 0, 0], 'rElbow': [-10, 0, 0], 'lHip': [0, 0, 4], 'rHip': [0, 0, -4]}
# P07 at the fire
POSES['giveA'] = {'lHip': [-128, 0, 10], 'rHip': [-128, 0, -10], 'lKnee': [85, 0, 0], 'rKnee': [85, 0, 0], 'lAnkle': [43, 0, -6], 'rAnkle': [43, 0, 6],
    'chest': [14, -18, -4], 'head': [12, -22, 0],
    'lShoulder': [-40, 0, 8], 'lElbow': [-60, 0, 0], 'rShoulder': [-52, 0, -30], 'rElbow': [-48, 0, 0], 'rWrist': [0, 60, 0]}
POSES['giveB'] = {'lHip': [-128, 0, 10], 'rHip': [-128, 0, -10], 'lKnee': [85, 0, 0], 'rKnee': [85, 0, 0], 'lAnkle': [43, 0, -6], 'rAnkle': [43, 0, 6],
    'chest': [14, 16, 4], 'head': [14, 20, 0],
    'rShoulder': [-40, 0, -8], 'rElbow': [-60, 0, 0], 'lShoulder': [-50, 0, 28], 'lElbow': [-50, 0, 0], 'lWrist': [0, -70, 0]}
POSES['leanL'] = {'lHip': [-130, 0, 10], 'rHip': [-130, 0, -10], 'lKnee': [87, 0, 0], 'rKnee': [87, 0, 0], 'lAnkle': [43, 0, -6], 'rAnkle': [43, 0, 6],
    'chest': [10, 0, -10], 'head': [8, 0, -24], 'lShoulder': [-55, 0, 6], 'rShoulder': [-50, 0, -4], 'lElbow': [-45, 0, 0], 'rElbow': [-50, 0, 0]}
POSES['leanR'] = {'lHip': [-130, 0, 10], 'rHip': [-130, 0, -10], 'lKnee': [87, 0, 0], 'rKnee': [87, 0, 0], 'lAnkle': [43, 0, -6], 'rAnkle': [43, 0, 6],
    'chest': [10, 0, 10], 'head': [8, 0, 24], 'lShoulder': [-50, 0, 4], 'rShoulder': [-55, 0, -6], 'lElbow': [-50, 0, 0], 'rElbow': [-45, 0, 0]}
POSES['apart'] = dict(POSES['sitHug'], head=[42, 0, 0], chest=[28, 0, 0])
POSES['stranger'] = {'chest': [0, 0, 0], 'head': [2, 0, 0], 'lShoulder': [0, 0, 5], 'rShoulder': [0, 0, -5], 'lHip': [0, 0, 3], 'rHip': [0, 0, -3]}
POSES['phoneDesk'] = {'lHip': [-86, 0, 5], 'rHip': [-86, 0, -5], 'lKnee': [88, 0, 0], 'rKnee': [88, 0, 0], 'chest': [18, 0, 0], 'head': [34, 0, 0],
    'lShoulder': [-20, -30, 0], 'rShoulder': [-20, 30, 0], 'lElbow': [-110, 0, 0], 'rElbow': [-110, 0, 0], 'lWrist': [0, 0, 8], 'rWrist': [0, 0, -8]}
POSES['p01look'] = {'chest': [-2, 6, 0], 'head': [-10, 18, 0], 'lShoulder': [4, 0, 7], 'rShoulder': [-14, 0, -9], 'lElbow': [-10, 0, 0], 'rElbow': [-38, 0, 0], 'rWrist': [0, 0, -6], 'lHip': [0, 0, 3], 'rHip': [0, 0, -3]}
# P09: sitting on the ground beside the cup, leaning back on the hands, content
POSES['relaxSit'] = {'lHip': [-88, 0, 6], 'rHip': [-140, 0, -6], 'lKnee': [2, 0, 0], 'rKnee': [105, 0, 0], 'lAnkle': [-8, 0, 0], 'rAnkle': [30, 0, 0],
    'chest': [-24, 0, 0], 'head': [-12, -14, 0], 'lShoulder': [75, 0, 14], 'rShoulder': [75, 0, -14], 'lElbow': [0, 0, 0], 'rElbow': [0, 0, 0], 'lWrist': [-80, 0, 0], 'rWrist': [-80, 0, 0]}
POSES['tagArm'] = {'chest': [4, 0, 0], 'head': [16, 10, 0], 'lShoulder': [0, 0, 6], 'lElbow': [-6, 0, 0], 'rShoulder': [-24, 0, -10], 'rElbow': [-30, 0, 0], 'rWrist': [0, 0, 0], 'lHip': [0, 0, 3], 'rHip': [0, 0, -3]}
# P03 lonely rooms
POSES['bedCurl'] = {'root': {'pos': [0, 0, 0], 'rot': [0, 0, 90]}, 'lHip': [-80, 0, 0], 'rHip': [-70, 0, 0], 'lKnee': [100, 0, 0], 'rKnee': [90, 0, 0],
    'chest': [26, 0, 0], 'head': [20, 0, 0], 'lShoulder': [-60, 0, 0], 'rShoulder': [-70, 0, 0], 'lElbow': [-90, 0, 0], 'rElbow': [-80, 0, 0]}
POSES['deskSlump'] = {'lHip': [-88, 0, 4], 'rHip': [-88, 0, -4], 'lKnee': [90, 0, 0], 'rKnee': [90, 0, 0], 'lAnkle': [-2, 0, 0], 'rAnkle': [-2, 0, 0],
    'chest': [22, 0, 0], 'head': [26, 0, 0], 'lShoulder': [-58, 0, 10], 'rShoulder': [-58, 0, -10], 'lElbow': [-60, 0, 0], 'rElbow': [-60, 0, 0]}
POSES['sofaHug'] = dict(POSES['sitHugKnees'])
POSES['windowStand'] = {'chest': [6, 0, 0], 'head': [18, 0, 0], 'lShoulder': [0, 0, 5], 'rShoulder': [-8, 0, -6], 'rElbow': [-70, 0, 0], 'lHip': [0, 0, 3], 'rHip': [0, 0, -3]}
POSES['tvSit'] = {'lHip': [-78, 0, 6], 'rHip': [-78, 0, -6], 'lKnee': [78, 0, 0], 'rKnee': [82, 0, 0], 'chest': [-10, 0, 0], 'head': [6, 0, 0],
    'lShoulder': [-8, 0, 16], 'rShoulder': [-8, 0, -16], 'lElbow': [-50, 0, 0], 'rElbow': [-50, 0, 0]}
# P15/P16 long table
_legs = {'lHip': [-88, 0, 4], 'rHip': [-88, 0, -4], 'lKnee': [90, 0, 0], 'rKnee': [90, 0, 0], 'lAnkle': [-2, 0, 0], 'rAnkle': [-2, 0, 0]}
POSES['tableA'] = dict(_legs, chest=[12, 0, 0], head=[4, 0, 0], lShoulder=[-50, 0, 8], rShoulder=[-50, 0, -8], lElbow=[-60, 0, 0], rElbow=[-60, 0, 0])
POSES['tableB'] = dict(_legs, chest=[8, 0, 0], head=[-4, 15, 0], lShoulder=[-50, 0, 8], lElbow=[-60, 0, 0], rShoulder=[-72, 0, -18], rElbow=[-78, 0, 0], rWrist=[-20, 0, 0])
POSES['tableC'] = dict(_legs, chest=[12, 0, 8], head=[4, -10, 14], lShoulder=[-50, 0, 8], rShoulder=[-50, 0, -8], lElbow=[-60, 0, 0], rElbow=[-60, 0, 0])
POSES['tableD'] = dict(_legs, chest=[8, 0, 0], head=[-6, 0, 0], lShoulder=[-50, 0, 8], lElbow=[-60, 0, 0], rShoulder=[-45, 0, -10], rElbow=[-132, 0, 0])
POSES['tableE'] = dict(_legs, chest=[-8, 0, 0], head=[-16, 0, 0], lShoulder=[-40, 0, 12], rShoulder=[-40, 0, -12], lElbow=[-70, 0, 0], rElbow=[-70, 0, 0])
POSES['tableF'] = dict(_legs, chest=[12, 0, -8], head=[4, 10, -14], lShoulder=[-50, 0, 8], rShoulder=[-50, 0, -8], lElbow=[-60, 0, 0], rElbow=[-60, 0, 0])
POSES['kneelGarden'] = {'lHip': [-6, 0, 6], 'rHip': [-70, 0, -6], 'lKnee': [96, 0, 0], 'rKnee': [100, 0, 0], 'lAnkle': [84, 0, 0], 'rAnkle': [-10, 0, 0],
    'chest': [34, 0, 0], 'head': [20, 0, 0], 'lShoulder': [-60, 0, 8], 'rShoulder': [-66, 0, -8], 'lElbow': [-20, 0, 0], 'rElbow': [-30, 0, 0]}
POSES['kneelPlant'] = dict(POSES['kneelWarm'], chest=[42, 0, 0], head=[22, 0, 0], lShoulder=[-40, 0, 10], rShoulder=[-46, 0, -10], lElbow=[-25, 0, 0], rElbow=[-20, 0, 0])
POSES['shield'] = {'chest': [-4, 0, 0], 'head': [-10, 0, 0], 'rShoulder': [-150, 0, -30], 'rElbow': [-112, 0, 0], 'rWrist': [30, 0, 0], 'lShoulder': [0, 0, 8], 'lElbow': [-10, 0, 0], 'lHip': [0, 0, 4], 'rHip': [0, 0, -4]}
POSES['kneelReach'] = {'lHip': [-6, 0, 4], 'rHip': [-6, 0, -4], 'lKnee': [96, 0, 0], 'rKnee': [96, 0, 0], 'lAnkle': [84, 0, 0], 'rAnkle': [84, 0, 0],
    'chest': [30, 0, 0], 'head': [22, 0, 0], 'rShoulder': [-58, 0, -6], 'rElbow': [-20, 0, 0], 'rWrist': [20, 0, 0], 'lShoulder': [-10, 0, 10], 'lElbow': [-30, 0, 0]}
POSES['phoneDeskFG'] = dict(POSES['phoneDesk'], head=[16, 0, 0], chest=[14, 0, 0])
POSES['heartHand'] = {'chest': [8, 0, 0], 'head': [18, 0, 0], 'rShoulder': [-10, 50, 0], 'rElbow': [-135, 0, 0], 'rWrist': [20, 0, 0], 'lShoulder': [0, 0, 7], 'lElbow': [-8, 0, 0], 'lHip': [0, 0, 3], 'rHip': [0, 0, -3]}
