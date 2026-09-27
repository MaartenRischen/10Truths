# Render brief — shared by all five directions

## The job
Maarten Rischen runs Demismatch (demismatch.com). Its thesis: modern distress is accurate signalling from a healthy organism in a world that no longer fits it (evolutionary mismatch). Its 5:26 film "You Are Not Broken" (published 2026-07-01) used photoreal AI stills of wooden painter's manikins in savanna and modern scenes, slow Ken Burns moves, serif subtitles and cream infographic cards. He wants a new version with a COMPLETELY different visual approach, still using painter's manikins in place of humans, that is the most eye-catching, polished and emotionally strong film anyone has made. He explicitly wants it to beat what people have made with Claude Opus 5.5 so far (code-rendered motion graphics, WebGL demos, p5.brush music videos, Remotion explainers, single Blender shots).

The director (me) has written five directions. You render ONE of them: two hero style frames and a 16-panel storyboard. The client judges the directions by these frames. They must look like finished style frames from a top studio (Buck, Elastic, Laika, Framestore, ManvsMachine), not placeholders, diagrams or previz boxes. If you must trade off: the two hero frames must be stunning; the 16 panels must be consistent, clear, and beautiful.

## Read first
- `sb/beats.md` — the 16 beats, their script lines, and the CANON LOCKS (anti-primitivism, not anti-psych, no real faces, no brands). Obey the locks in every frame.
- `sb/directions/<your direction>.md` — logline, look, signature moments, the 16-panel shot list, production notes. Follow the shot list. If a panel would be clearly better another way, do the better thing and say why in notes.md.
- `sb/script.json` — the full script with timestamps (for reference).

(All paths relative to the scratchpad: /tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad)

## Tools already set up
- `kit/mannequin.js` — a procedural painter's manikin for three.js (r186). `buildMannequin({material, jointMaterial})` returns `{root, joints, setPose(pose), ground(y), worldOf(jointName)}`. `woodMaterial({seed, base:[r,g,b], dark:[r,g,b], roughness, clearcoat})` makes procedural beech; pass other materials for walnut, ochre, line-art, etc. `POSES` holds presets: stand, standTall, walk, slump, sitChair, sitPhone, sitHugKnees, sitCrossFire, kneel, kneelGrief, reachUp, reachForward, lieCurl, carry, armsOpen, handToChest, headInHands. Add your own poses in your own files (do not edit mannequin.js; copy a pose object and change it).
  - Units: 1 head = 0.25; standing figure about 2.0 tall; feet on y = 0 after `ground(0)`; faces +Z.
  - Joints: pelvis, chest, neck (fixed), head, lShoulder/lElbow/lWrist, rShoulder/rElbow/rWrist, lHip/lKnee/lAnkle, rHip/rKnee/rAnkle. Pose values are Euler degrees [x, y, z]; `root: {pos:[x,y,z], rot:[x,y,z]}` places the whole figure.
  - Conventions: arms hang along -Y. Shoulder X negative = raise the arm forward; shoulder Z positive (left) / negative (right) = raise sideways. Elbow X negative = bend forward. Hip X negative = thigh forward; knee X positive = bend back. Chest X positive = lean forward; head X positive = look down. Check every pose visually; fix limbs passing through bodies.
- `kit/harness.html` + `kit/shot.mjs` — render a scene module to PNG with headless Chromium (WebGL2 via SwiftShader, CPU). A local server serves `kit/` at http://127.0.0.1:8765/ (if it is down: `cd kit && nohup python3 -m http.server 8765 --bind 127.0.0.1 &`). Put your modules in `kit/scenes/<letter>/`. A scene module is `export default async function({w, h, q})`: create a canvas or a THREE.WebGLRenderer (use `preserveDrawingBuffer: true`), append it to document.body, render, and return. Then:
  `cd kit && node shot.mjs "harness.html?scene=scenes/<letter>/p01.js&any=params" /abs/path/out.png 1280 720`
  The harness screenshots the first <canvas>. Import maps: `three` and `three/addons/...` (EffectComposer, RenderPass, UnrealBloomPass, BokehPass, GTAOPass, SMAAPass, OutputPass, FilmPass, ShaderPass, RoomEnvironment, GLTFExporter, etc. are available).
- Blender 5.0.1 as a Python module with Cycles + OpenImageDenoise: `/tmp/claude-0/bpyenv/bin/python your_script.py` with `import bpy`. (The apt `blender` binary is 4.0 without a denoiser: do not use it.) To use the exact same manikin in Blender: `cd kit && node export-glb.mjs <poseName> out.glb` or `node export-glb.mjs 'json:{"lHip":[-30,0,0]}' out.glb` exports a posed manikin as GLB; import with `bpy.ops.import_scene.gltf(filepath=...)` (three.js +Z forward becomes Blender -Y). Replace its materials with your own. Cycles CPU at 1280x720, ~64 samples with OIDN denoise is a good starting point; keep a frame under ~3 minutes.
- ffmpeg and Python 3.11 with numpy and Pillow are installed. npm install works (registry.npmjs.org); most other internet hosts are blocked (no model downloads, no image APIs).

## Deliverables (write into `sb/opt-<letter>/`)
- `hero-1.png` — 1920x1080. The single most arresting frame of the direction (usually its signature moment #1 or the image that sells the idea fastest).
- `hero-2.png` — 1920x1080. A second signature moment, different in light and composition from hero-1.
- `p01.png` … `p16.png` — 1280x720, one per beat, following the shot list. (Direction E: see its own spec for paired frames.)
- Optional, only if time allows after all stills are done: `loop.mp4` — a 4–6 s motion test, H.264, 1280x720, 24 fps, under 3 MB, showing how the direction MOVES (e.g. the line drawing itself, threads landing, the stop-motion orbit).
- `notes.md` — under 15 lines: what you built, render settings/timings, which panels you are least happy with, and any recommendation to change the direction.
Write only into `sb/opt-<letter>/` and `kit/scenes/<letter>/` (and /tmp scratch). Do not commit to git. Do not touch the other directions' folders.

## Quality bar and self-review
- Look at every frame you render (Read the PNG) and fix what you see: awkward poses, limbs through bodies, figures floating above floors, muddy or clipped exposure, empty or cluttered compositions, anything that doesn't read at thumbnail size. Iterate until each frame reads instantly as the moment it depicts.
- Cinematic composition: rule of thirds, depth (foreground / midground / background), a clear focal point, motivated light. Use lenses deliberately (wide for scale, long for intimacy). Grade with intent.
- No text in frames unless the direction calls for it (A writes by hand at the hinge and end; B may carve the end title; C may have small hand-lettered tags; B's marble tags are allowed). No real human faces, bodies or photos. No brand names or logos.
- The machine has 4 CPU cores shared with the other four render jobs. Be economical: test at low resolution, render finals once.

## When you finish
Reply with: the file list, one line per panel saying what it shows, the render times, and the two or three panels that are weakest and why.
