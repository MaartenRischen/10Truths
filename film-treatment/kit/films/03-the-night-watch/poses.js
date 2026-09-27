// Film 03 — pose library (degrees; X = flex, Y = twist, Z = side). Figures face +Z; left = +X.
export const STAND = { lHip: [0, 0, 3], rHip: [0, 0, -3], lShoulder: [2, 0, 6], rShoulder: [2, 0, -6], lElbow: [-10, 0, 0], rElbow: [-10, 0, 0], chest: [2, 0, 0], head: [2, 0, 0] };
export const STAND_TIRED = { ...STAND, chest: [8, 0, 0], head: [14, 0, 0], lShoulder: [4, 0, 5], rShoulder: [4, 0, -5], lElbow: [-8, 0, 0], rElbow: [-8, 0, 0] };

// the vigil upper body (hand at the brow, head turned right, leaning in) — shared by the door (standing) and the rock (sitting)
export const VIGIL_UP = { pelvis: [0, 0, 0], chest: [5, -10, 0], head: [-8, -30, 3], lShoulder: [-6, 0, 7], lElbow: [-22, 0, 0], lWrist: [0, 0, 0] };
export const LEGS_STAND = { lHip: [1, 0, 3], rHip: [-3, 0, -3], lKnee: [3, 0, 0], rKnee: [6, 0, 0], lAnkle: [0, 0, 0], rAnkle: [-2, 0, 0] };
export const LEGS_SIT = { lHip: [-82, 4, 12], rHip: [-78, -4, -12], lKnee: [92, 0, 0], rKnee: [84, 0, 0], lAnkle: [-8, 0, 0], rAnkle: [-4, 0, 0] };

// sitting on the rock, hands resting on the knees, upright and alert
export const SIT_WATCH = { ...LEGS_SIT, pelvis: [0, 0, 0], chest: [6, 0, 0], head: [0, 0, 0], lShoulder: [-30, 0, 8], lElbow: [-42, 0, 0], rShoulder: [-30, 0, -8], rElbow: [-42, 0, 0], lWrist: [10, 0, 0], rWrist: [10, 0, 0] };
export const SIT_TIRED = { ...SIT_WATCH, chest: [16, 0, 0], head: [12, 0, 0], lShoulder: [-26, 0, 6], rShoulder: [-26, 0, -6], lElbow: [-50, 0, 0], rElbow: [-50, 0, 0] };

// sitting on the edge of the bed (feet on the floor), phone in both hands at the chest
export const SIT_EDGE = { lHip: [-84, 0, 7], rHip: [-84, 0, -7], lKnee: [88, 0, 0], rKnee: [88, 0, 0], lAnkle: [-4, 0, 0], rAnkle: [-4, 0, 0], chest: [10, 0, 0], head: [8, 0, 0], lShoulder: [-10, 0, 8], rShoulder: [-10, 0, -8], lElbow: [-40, 0, 0], rElbow: [-40, 0, 0] };
export const SIT_PHONE = { ...SIT_EDGE, chest: [24, 0, 0], head: [30, 0, 0], lShoulder: [-26, -12, 12], rShoulder: [-26, 12, -12], lElbow: [-104, 0, -8], rElbow: [-104, 0, 8], lWrist: [0, 0, 10], rWrist: [0, 0, -10] };

// lying on the left side, curled a little (sleep / the match pose)
export const LIE_SIDE = {
  pelvis: [0, 0, 0], chest: [10, 0, 0], head: [10, 0, -4],
  lHip: [-42, 0, 2], lKnee: [70, 0, 0], rHip: [-54, 0, -4], rKnee: [80, 0, 0], lAnkle: [8, 0, 0], rAnkle: [8, 0, 0],
  lShoulder: [-78, 0, -6], lElbow: [-96, 0, 0], lWrist: [0, 0, 0],
  rShoulder: [-40, 0, 22], rElbow: [-70, 0, 0], rWrist: [0, 0, 0],
};
// lying on the back, head turned to the ceiling (awake), one hand on the chest
export const LIE_BACK = {
  pelvis: [0, 0, 0], chest: [0, 0, 0], head: [-6, 0, 0],
  lHip: [-4, 0, 4], lKnee: [8, 0, 0], rHip: [-10, 0, -3], rKnee: [18, 0, 0],
  lShoulder: [-8, 0, 12], lElbow: [-12, 0, 0], rShoulder: [-36, 0, 4], rElbow: [-118, 0, 0], rWrist: [0, 0, 0],
};
// kneeling upright (about to lie down)
export const KNEEL = { lHip: [-6, 0, 6], rHip: [-6, 0, -6], lKnee: [112, 0, 0], rKnee: [112, 0, 0], lAnkle: [36, 0, 0], rAnkle: [36, 0, 0], chest: [10, 0, 0], head: [16, 0, 0], lShoulder: [-10, 0, 8], rShoulder: [-10, 0, -8], lElbow: [-20, 0, 0], rElbow: [-20, 0, 0] };
// side-sitting, propped on the left elbow (half way down)
export const PROP = { lHip: [-50, 0, 6], rHip: [-60, 0, -4], lKnee: [100, 0, 0], rKnee: [96, 0, 0], lAnkle: [10, 0, 0], rAnkle: [10, 0, 0], chest: [6, 0, 0], head: [6, 0, 0], lShoulder: [-60, 0, -30], lElbow: [-90, 0, 0], rShoulder: [-30, 0, 10], rElbow: [-50, 0, 0] };
// sitting on the ground, knees up (waking)
export const SIT_GROUND = { lHip: [-100, 0, 14], rHip: [-96, 0, -14], lKnee: [110, 0, 0], rKnee: [104, 0, 0], lAnkle: [-10, 0, 0], rAnkle: [-10, 0, 0], chest: [14, 0, 0], head: [8, 0, 0], lShoulder: [-40, 0, 14], rShoulder: [-40, 0, -14], lElbow: [-40, 0, 0], rElbow: [-40, 0, 0] };
export const CROUCH = { lHip: [-110, 0, 10], rHip: [-60, 0, -8], lKnee: [120, 0, 0], rKnee: [110, 0, 0], lAnkle: [-20, 0, 0], rAnkle: [30, 0, 0], chest: [34, 0, 0], head: [-10, 0, 0], lShoulder: [-30, 0, 10], rShoulder: [-50, 0, -10], lElbow: [-30, 0, 0], rElbow: [-20, 0, 0] };

// sleepers: variants of the side pose
export const SLEEP = [
  { ...LIE_SIDE },
  { ...LIE_SIDE, chest: [18, 0, 0], head: [16, 8, -6], lHip: [-60, 0, 2], lKnee: [96, 0, 0], rHip: [-70, 0, -2], rKnee: [100, 0, 0], rShoulder: [-60, 0, 30], rElbow: [-40, 0, 0] },
  { ...LIE_SIDE, chest: [4, 0, 0], head: [2, -6, -2], lHip: [-20, 0, 2], lKnee: [30, 0, 0], rHip: [-34, 0, -2], rKnee: [50, 0, 0], rShoulder: [-10, 0, 18], rElbow: [-20, 0, 0] },
  { ...LIE_SIDE, chest: [12, 0, 0], lHip: [-50, 0, 4], lKnee: [80, 0, 0], rHip: [-30, 0, -6], rKnee: [40, 0, 0], lShoulder: [-100, 0, -10], lElbow: [-60, 0, 0], rShoulder: [-80, 0, 30], rElbow: [-30, 0, 0] },
];
