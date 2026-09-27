# Production brief — one film, from script to a watchable vertical animatic

You are the animator/cinematographer/sound designer for ONE of four Demismatch shorts. The director (me) wrote the script; you make it into a watchable 60–80 s vertical animatic with temp music and sound. Maarten will show these to people who have never heard of Demismatch, to test whether they understand and feel them, before anything gets a final render. So the job is: **the story reads without words, the timing breathes, the acting (posture) lands, and it looks good enough that people forget it's a test.**

(All paths relative to the scratchpad: /tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad)

## Read first
1. `sb/films/SERIES.md` — rules shared by all four films (form, look, sound, canon locks). Obey them.
2. Your script: `sb/films/0N-<name>.md` — shot list with timings, frames, action, light, sound. Follow it. If a shot is clearly better another way, do it and say why in notes.md. Keep the total within ±10% of the script's length.
3. `kit/films/_test/film.js` — a working two-shot film showing the API.
4. `kit/film/engine.js` (tracks, poseTrack/slerp, boil, applyPose, applyCam, handheld), `kit/film/runner.js`, `kit/film/text.js` (endCardShot, notificationScreen, printedCard, brand colours), `kit/film/audio.py` (cue-sheet synth: read its docstring).
5. Direction E's library, which you should reuse heavily: `kit/scenes/E/lib/` — cine.js (renderer, GRADES, post), figs.js (figure(), seatFig, groundFig, reachIK, jointPoint), props.js (bedroom, bed, nightstand, lamp, phone, phoneScreenTex, reedHut, bedding, fire, sparks, nightSky, daySky, grassTufts), sets.js (earthGround, grassField, acacia, fireCamp), modern.js (city, sofa, laptop, kitchen, table, chair), court.js (courtyard), mat.js (textures: plaster, planks, tiles, fabric...). Look at `kit/scenes/E/p10.js`, `p01.js`, `p15.js` for how E built full sets. E's final stills are in `sb/opt-E/` (look at them: that is the quality bar for light and grade).
6. The manikin rig and pose conventions: `sb/RENDER-BRIEF.md` (section "Tools already set up") and `kit/mannequin.js`.

Do NOT edit shared files (kit/mannequin.js, kit/film/*, kit/scenes/E/lib/*, kit/films/_test). Copy anything you need to change into your own folder.

## Where things go
- Your film code: `kit/films/0N-<name>/film.js` (+ any helper modules in that folder).
- Your outputs: `sb/films/out/0N/`:
  - `frames/` — every frame (f_00000.png …) at 720x1280, quality animatic.
  - `board/` — one still per shot at 720x1280, quality still (24 samples), named `sNN.png` (rename after rendering).
  - `cues.json` and `audio.wav` — the temp score + foley cue sheet and its render.
  - `film.mp4` — the assembled animatic (kit/film/assemble.sh).
  - `notes.md` — under 15 lines: what you built, timings, what's weakest, what the final version needs.

## How to render
- Server: `kit/` is served at http://127.0.0.1:8765/ (start it if down: `cd kit && nohup python3 -m http.server 8765 --bind 127.0.0.1 &`).
- Frames: `cd kit && node film/render-film.mjs films/0N-<name>/film.js <outDir> [start|list] [end] [w] [h] [quality] [step]`
  - quick look at chosen frames: `node film/render-film.mjs films/0N-x/film.js /tmp/x "0,40,120" 0 360 640 animatic`
  - low-res full preview to check timing: `... /tmp/prev 0 -1 360 640 animatic 2` (every 2nd frame)
  - final: `... ../sb/films/out/0N/frames 0 -1 720 1280 animatic` (resumable; you can run 2 processes on disjoint ranges)
  - board stills: `... /tmp/board "<mid-frame of each shot, comma list>" 0 720 1280 still`, then rename to sNN.png
- Audio: write `cues.json` (music + sfx + beds with timestamps matching your shot times), then `python3 kit/film/audio.py sb/films/out/0N/cues.json sb/films/out/0N/audio.wav`.
- Assemble: `bash kit/film/assemble.sh sb/films/out/0N/frames sb/films/out/0N/audio.wav sb/films/out/0N/film.mp4`
- Measured speed: ~1.2–3 s per 720x1280 frame at animatic quality when the machine is free. Four films render at once on 4 shared cores, so budget accordingly: test at 360x640, render finals once.

## Quality bar and self-review
- Look at your frames (Read the PNGs, or tile every 6th frame into a contact sheet) before the final render. Fix: floating or sinking feet, limbs through bodies or furniture, poses that don't read, empty or muddled compositions, text that isn't readable on a phone, lighting that goes muddy or blows out, grades that jump without reason.
- Performance (acting): anticipation before big moves, holds on key poses (6–12 frames), overlap (the head leads, the body follows), and stillness where the script asks for it. One idea per shot, readable in the first second.
- Continuity: props stay where they were; match cuts match exactly.
- Sound: every visible impact has a sound; the music leaves space; silence where the script asks for it; the end card holds in near silence.
- Budget: aim to finish in about 2–3 hours of wall time. If rendering is slow, simplify geometry (fewer grass blades, fewer shadow-casting lights) before cutting shots.

When you finish, reply with: the output paths, the final duration, one line per shot saying what it shows, render timings, and the two or three weakest moments.
