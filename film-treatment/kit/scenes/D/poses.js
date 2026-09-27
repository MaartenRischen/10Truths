// Custom poses for direction D (copied/adapted from mannequin.js POSES; degrees)
import { POSES } from '../../mannequin.js';
export const PZ = {
  // around the fire
  sitFire: { lHip: [-80, 0, 38], rHip: [-80, 0, -38], lKnee: [128, 0, 0], rKnee: [128, 0, 0], lAnkle: [0, 0, -20], rAnkle: [0, 0, 20], chest: [12, 0, 0], head: [6, 0, 0], lShoulder: [-40, 0, 10], rShoulder: [-40, 0, -10], lElbow: [-55, 0, 0], rElbow: [-55, 0, 0] },
  sitWarm: { lHip: [-80, 0, 38], rHip: [-80, 0, -38], lKnee: [128, 0, 0], rKnee: [128, 0, 0], lAnkle: [0, 0, -20], rAnkle: [0, 0, 20], chest: [16, 0, 0], head: [2, 0, 0], lShoulder: [-62, 0, 14], rShoulder: [-62, 0, -14], lElbow: [-20, 0, 0], rElbow: [-20, 0, 0], lWrist: [30, 0, 0], rWrist: [30, 0, 0] },
  sitLean: { lHip: [-84, 0, 20], rHip: [-70, 0, -30], lKnee: [120, 0, 0], rKnee: [100, 0, 0], chest: [4, 0, -8], head: [-6, 0, 8], lShoulder: [-10, 0, 30], lElbow: [-10, 0, 0], rShoulder: [-50, 0, -10], rElbow: [-60, 0, 0] },
  sitHug: POSES.sitHugKnees,
  sitTalk: { lHip: [-82, 0, 30], rHip: [-82, 0, -30], lKnee: [120, 0, 0], rKnee: [120, 0, 0], lAnkle: [0, 0, -15], rAnkle: [0, 0, 15], chest: [6, 10, 0], head: [-4, 14, 0], lShoulder: [-30, 0, 12], lElbow: [-70, 0, 0], rShoulder: [-55, -20, -30], rElbow: [-50, 0, 0] },
  kneelTend: { lHip: [-8, 0, 3], rHip: [-70, 0, -3], lKnee: [118, 0, 0], rKnee: [80, 0, 0], lAnkle: [40, 0, 0], chest: [26, 0, 0], head: [22, 0, 0], lShoulder: [-60, 0, 6], rShoulder: [-40, 0, -6], lElbow: [-30, 0, 0], rElbow: [-30, 0, 0] },
  lieBack: { root: { pos: [0, 0, 0], rot: [-90, 0, 0] }, lHip: [-6, 0, 4], rHip: [-24, 0, -4], rKnee: [40, 0, 0], lShoulder: [-10, 0, 20], rShoulder: [-160, 0, -10], rElbow: [-60, 0, 0], head: [-10, 0, 0] },
  lieSide: { root: { pos: [0, 0, 0], rot: [0, 0, 90] }, lHip: [-40, 0, 0], rHip: [-30, 0, 0], lKnee: [60, 0, 0], rKnee: [50, 0, 0], chest: [10, 0, 0], head: [10, 0, 0], lShoulder: [-80, 0, 0], rShoulder: [-60, 0, 0], lElbow: [-60, 0, 0], rElbow: [-40, 0, 0] },
  standRelax: { chest: [2, 0, 0], head: [4, 0, 0], lShoulder: [2, 0, 8], rShoulder: [-4, 0, -7], lElbow: [-10, 0, 0], rElbow: [-14, 0, 0], lHip: [-3, 0, 3], rHip: [2, 0, -1], rKnee: [6, 0, 0] },
  standCarry: { chest: [-4, 0, 0], head: [2, 0, 0], lShoulder: [-40, 0, 10], lElbow: [-100, 0, 0], rShoulder: [-30, 0, -10], rElbow: [-100, 0, 0] },
  walkA: POSES.walk,
  squat: { lHip: [-120, 0, 14], rHip: [-120, 0, -14], lKnee: [150, 0, 0], rKnee: [150, 0, 0], lAnkle: [-30, 0, 0], rAnkle: [-30, 0, 0], chest: [30, 0, 0], head: [10, 0, 0], lShoulder: [-40, 0, 10], rShoulder: [-40, 0, -10], lElbow: [-40, 0, 0], rElbow: [-40, 0, 0] },
  sitLog: { lHip: [-86, 0, 9], rHip: [-86, 0, -9], lKnee: [84, 0, 0], rKnee: [84, 0, 0], lAnkle: [4, 0, 0], rAnkle: [4, 0, 0], chest: [18, 0, 0], head: [8, 0, 0], lShoulder: [-38, 0, 8], rShoulder: [-38, 0, -8], lElbow: [-44, 0, 0], rElbow: [-44, 0, 0] },
  sitLogWarm: { lHip: [-86, 0, 9], rHip: [-86, 0, -9], lKnee: [80, 0, 0], rKnee: [80, 0, 0], chest: [14, 0, 0], head: [2, 0, 0], lShoulder: [-68, 0, 10], rShoulder: [-68, 0, -10], lElbow: [-14, 0, 0], rElbow: [-14, 0, 0], lWrist: [36, 0, 0], rWrist: [36, 0, 0] },
  sitLogTalk: { lHip: [-86, 0, 12], rHip: [-86, 0, -12], lKnee: [92, 0, 0], rKnee: [80, 0, 0], chest: [4, 14, 0], head: [-6, 18, 0], lShoulder: [-30, 0, 10], lElbow: [-60, 0, 0], rShoulder: [-60, -10, -24], rElbow: [-46, 0, 0] },
  // modern / emotional
  standBow: { chest: [12, 0, 0], head: [26, 0, 0], lShoulder: [-4, 0, 5], rShoulder: [-4, 0, -5], lElbow: [-8, 0, 0], rElbow: [-8, 0, 0] },
  selfHold: { chest: [14, 0, 0], head: [26, 0, 0], lShoulder: [-38, -80, 8], lElbow: [-118, 0, 0], rShoulder: [-44, 80, -8], rElbow: [-112, 0, 0] },
  selfHoldB: { chest: [14, 0, 0], head: [26, 0, 0], lShoulder: [-38, 80, 8], lElbow: [-118, 0, 0], rShoulder: [-44, -80, -8], rElbow: [-112, 0, 0] },
  lookUp: { chest: [-6, 0, 0], head: [-26, 0, 0], lShoulder: [0, 0, 8], rShoulder: [0, 0, -8], lElbow: [-8, 0, 0], rElbow: [-8, 0, 0] },
  armsOpenUp: { chest: [-8, 0, 0], head: [-22, 0, 0], lShoulder: [-30, 0, 60], rShoulder: [-30, 0, -60], lElbow: [-10, 0, 0], rElbow: [-10, 0, 0] },
  turnAway: { chest: [8, -20, 0], head: [10, -35, 0], lShoulder: [-10, 0, 20], rShoulder: [-30, 0, -8], rElbow: [-70, 0, 0], lElbow: [-20, 0, 0], lHip: [-8, 0, 2], rHip: [10, 0, -2], rKnee: [14, 0, 0] },
  holdTool: { chest: [10, 0, 0], head: [16, 0, 0], rShoulder: [-52, 0, -8], rElbow: [-62, 0, 0], rWrist: [0, 0, 0], lShoulder: [-8, 0, 8], lElbow: [-16, 0, 0] },
  sitTable: { lHip: [-86, 0, 5], rHip: [-86, 0, -5], lKnee: [88, 0, 0], rKnee: [88, 0, 0], chest: [8, 0, 0], head: [4, 0, 0], lShoulder: [-44, 0, 8], rShoulder: [-44, 0, -8], lElbow: [-50, 0, 0], rElbow: [-50, 0, 0] },
  sitPhone: POSES.sitPhone,
};
