# Forward kinematics mirroring kit/mannequin.js (rig units, three.js frame: Y up, +Z forward).
# Used to design contact poses (sitting on ground/chairs, hands on props) before exporting.
import math
import numpy as np

H = 0.25
OFF = {
    'pelvis': ('root', (0, 4.0 * H + 0.25 * H, 0)),
    'chest': ('pelvis', (0, 0.5 * H, 0)),
    'neck': ('chest', (0, 1.55 * H + 0.1 * H, 0)),
    'head': ('neck', (0, 0.08 * H, 0)),
    'lShoulder': ('chest', (0.98 * H, 1.55 * H - 0.18 * H, 0)),
    'rShoulder': ('chest', (-0.98 * H, 1.55 * H - 0.18 * H, 0)),
    'lElbow': ('lShoulder', (0, -1.45 * H - 0.02 * H, 0)),
    'rElbow': ('rShoulder', (0, -1.45 * H - 0.02 * H, 0)),
    'lWrist': ('lElbow', (0, -1.25 * H - 0.02 * H, 0)),
    'rWrist': ('rElbow', (0, -1.25 * H - 0.02 * H, 0)),
    'lHip': ('pelvis', (0.4 * H, -0.3 * H, 0)),
    'rHip': ('pelvis', (-0.4 * H, -0.3 * H, 0)),
    'lKnee': ('lHip', (0, -1.95 * H - 0.03 * H, 0)),
    'rKnee': ('rHip', (0, -1.95 * H - 0.03 * H, 0)),
    'lAnkle': ('lKnee', (0, -1.9 * H - 0.05 * H, 0)),
    'rAnkle': ('rKnee', (0, -1.9 * H - 0.05 * H, 0)),
}
ORDER = ['pelvis', 'chest', 'neck', 'head', 'lShoulder', 'rShoulder', 'lElbow', 'rElbow', 'lWrist', 'rWrist',
         'lHip', 'rHip', 'lKnee', 'rKnee', 'lAnkle', 'rAnkle']
REST = {'lShoulder': [0, 0, 6], 'rShoulder': [0, 0, -6], 'lHip': [0, 0, 2], 'rHip': [0, 0, -2]}

def rx(a):
    c, s = math.cos(a), math.sin(a); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
def ry(a):
    c, s = math.cos(a), math.sin(a); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
def rz(a):
    c, s = math.cos(a), math.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
def eul(d):
    x, y, z = [math.radians(v) for v in d]
    return rx(x) @ ry(y) @ rz(z)  # three.js 'XYZ'

def fk(pose):
    p = dict(REST); p.update(pose)
    root = p.get('root', {})
    R0 = eul(root.get('rot', [0, 0, 0])) if isinstance(root, dict) else np.eye(3)
    T0 = np.array(root.get('pos', [0, 0, 0]) if isinstance(root, dict) else [0, 0, 0], dtype=float)
    W = {'root': (R0, T0)}
    for j in ORDER:
        par, off = OFF[j]
        Rp, Tp = W[par]
        T = Tp + Rp @ np.array(off)
        R = Rp @ (eul(p[j]) if (j in p and j != 'neck') else np.eye(3))
        W[j] = (R, T)
    return W

def keypoints(pose):
    W = fk(pose)
    k = {j: W[j][1].copy() for j in W}
    for s in 'lr':
        R, T = W[s + 'Wrist']; k[s + 'Hand'] = T + R @ np.array([0, -0.04 * H - 0.35 * H, 0])
        k[s + 'HandTip'] = T + R @ np.array([0, -0.04 * H - 0.7 * H, 0])
        R, T = W[s + 'Ankle']
        k[s + 'Heel'] = T + R @ np.array([0, -0.1 * H - 0.09 * H, -0.18 * H + 0.1 * H])
        k[s + 'Toe'] = T + R @ np.array([0, -0.1 * H - 0.09 * H, -0.18 * H + 0.95 * H])
        R, T = W[s + 'Knee']; k[s + 'KneeFront'] = T + R @ np.array([0, 0, 0.2 * H])
        R, T = W[s + 'Hip']; k[s + 'ThighUnder'] = T + R @ np.array([0, -0.5 * H, -0.3 * H])
    R, T = W['pelvis']; k['seat'] = T + R @ np.array([0, -0.58 * H, 0])
    R, T = W['head']; k['headTop'] = T + R @ np.array([0, 0.42 * H * 0.62 + 1.0 * H, 0]); k['face'] = T + R @ np.array([0, 0.75 * H, 0.4 * H])
    return k

def report(pose, pts=('seat', 'lHeel', 'lToe', 'rHeel', 'rToe', 'lHand', 'rHand', 'lKnee', 'rKnee', 'lThighUnder', 'headTop')):
    k = keypoints(pose)
    ymin = min(v[1] for n, v in k.items() if n != 'root')
    out = {}
    for n in pts:
        v = k[n]; out[n] = (round(v[0], 3), round(v[1] - ymin, 3), round(v[2], 3))
    return out

def to_blender(v, ground_off=0.0, scale=0.15):
    """three (x, y, z) rig units -> blender metres (x, -z, y) before object rotation."""
    return (v[0] * scale, -v[2] * scale, (v[1] - ground_off) * scale)
