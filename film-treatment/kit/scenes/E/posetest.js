// Pose inspection: renders a figure (pose JSON in ?pose=, root euler in ?eul=x,y,z[,order]) from front / side / top / 3-4.
import * as THREE from 'three';
import * as F from './lib/figs.js';
import { POSES } from '../../mannequin.js';
export default async function ({ w, h, q }) {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(w, h); r.setPixelRatio(1);
  r.toneMapping = THREE.AgXToneMapping; r.setScissorTest(true); document.body.appendChild(r.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x30343a);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.2)); const d = new THREE.DirectionalLight(0xffffff, 2.5); d.position.set(2, 4, 3); scene.add(d);
  const grid = new THREE.GridHelper(6, 24, 0x888888, 0x555555); scene.add(grid);
  const ax = new THREE.AxesHelper(1.2); scene.add(ax);
  const names = (q.get('poses') || '').split('|').filter(Boolean);
  const list = names.length ? names : [q.get('pose') || 'stand'];
  const eul = (q.get('eul') || '0,0,0').split(',');
  list.forEach((pn, i) => {
    const pose = pn.startsWith('{') ? JSON.parse(pn) : (POSES[pn] || {});
    const f = F.figure({ pose });
    f.group.quaternion.setFromEuler(new THREE.Euler(+eul[0] * Math.PI / 180, +eul[1] * Math.PI / 180, +eul[2] * Math.PI / 180, eul[3] || 'XYZ'));
    f.group.position.x = (i - (list.length - 1) / 2) * 1.6;
    F.groundFig(f, 0); scene.add(f.group);
  });
  const views = [[[0, 1.1, 7], [0, 0.8, 0], 'front +Z'], [[7, 1.1, 0], [0, 0.8, 0], 'side +X'], [[0.01, 8, 0], [0, 0, 0], 'top'], [[4.5, 3, 4.5], [0, 0.7, 0], '3/4']];
  const vw = w / 2, vh = h / 2;
  views.forEach(([p, l], i) => {
    const cam = new THREE.PerspectiveCamera(32, vw / vh, 0.1, 100); cam.position.set(...p); cam.lookAt(...l);
    const x = (i % 2) * vw, y = (1 - Math.floor(i / 2)) * vh;
    r.setViewport(x, y, vw, vh); r.setScissor(x, y, vw, vh); r.render(scene, cam);
  });
}
