# Four short films (rough cuts, 27 September 2026)

Four one-minute companion films to *You Are Not Broken*. They carry the same message, run vertical and close to wordless, and each has one character and one turn. These are animatics: story, timing, staging and sound are meant to carry into the finished films, while the picture is a quick render and the music a temporary score synthesised in code. They are for testing on people who have never heard of Demismatch before anything gets a final render.

| # | Film | Length | Shots | End card |
|---|------|--------|-------|----------|
| 01 | The Visitor | 1:20 | 17 + card | He'd love our world. He'd never understand why we're alone in it. |
| 02 | Care Instructions | 1:04.5 | 13 + card | You came with instructions. We're writing them down. |
| 03 | The Night Watch | 1:13 | 14 + card | You were never meant to keep watch alone. |
| 04 | Good Dog | 1:02.5 | 11 + card | Nobody calls a lonely dog broken. |

The review page (`page/index.html`, also published as a private Claude artifact) has the four films, their storyboards, the director's notes (what each film is aiming for, the weakest moments, what the final needs), ratings and a screening log.

## Layout
- `scripts/`: `SERIES.md` (rules shared by all four: form, look, sound, canon locks), `FILM-BRIEF.md` (the production brief each film was made from) and the four shooting scripts.
- `out/0N/`: each film's cue sheet (`cues.json`), real shot timings (`film.json`) and the animator's notes (`notes.md`).
- `page/`: the review page. `build.py` + `template.html` + `review.json` build `index.html`; `media/` holds web copies of the films (H.264, about 14 MB each) and `img/` the storyboard stills.
- `../kit/film/`: the engine, shared by all four films:
  - `engine.js`: keyframe tracks, per-joint quaternion pose interpolation, stop-motion "boil", grounding, camera tracks.
  - `runner.js`: loads a film module in `harness.html` and renders frame *i*.
  - `render-film.mjs`: resumable frame renderer (Playwright + SwiftShader WebGL).
  - `text.js`: the end card, the phone notification and the printed card.
  - `audio.py`: numpy synthesiser for the temporary score and foley, driven by a cue sheet.
  - `assemble.sh`: frames + audio → H.264.
- `../kit/films/0N-*/`: each film's sets, cast, poses, `film.js` and sound scripts. The films reuse Direction E's renderer and set library in `../kit/scenes/E/lib/`.

## Rebuild a film
```
cd film-treatment/kit
npm install                      # three 0.186, playwright 1.56
# fonts: put Spectral 300/300 italic/400/400 italic and JetBrains Mono 400/500 (woff2, SIL Open Font License)
# from Google Fonts into kit/film/fonts/ with the file names runner.js expects (they are not redistributed here)
python3 -m http.server 8765 --bind 127.0.0.1 &
node film/render-film.mjs films/03-the-night-watch/film.js ../films/out/03/frames 0 -1 720 1280 animatic
python3 film/audio.py ../films/out/03/cues.json ../films/out/03/audio.wav
bash film/assemble.sh ../films/out/03/frames ../films/out/03/audio.wav ../films/out/03/film.mp4
```
Film-specific steps: 01 renders at 540×960 and is upscaled to 720×1280 with fresh grain by `films/01-the-visitor/upscale.py`. 02 renders held frames once and `films/02-care-instructions/fill.py` duplicates them. 02, 03 and 04 mix their sound with their own copies of the synthesiser (`audio02.py`, `mix.py`, `audio04.py`), which add sounds and fix two length bugs since fixed in `film/audio.py`. 04's final mix is 4 dB quieter than its `audio.wav` so all four films sit near −17 LUFS.

Frame renders took 3.6 to 15 s per frame on four shared CPU cores. The final versions need native 1080×1920 at 16 or more samples, real depth of field, hand-keyed acting in the key moments and composed music; each film's notes list the specifics.
