# Film treatment: You Are Not Broken, new visual version

Working folder for the new visual version of the Demismatch film *You Are Not Broken*. Not part of the website.

The script stays exactly as published (`script.md`, recovered from the published film's subtitles). Five visual directions, all using painter's manikins in place of people, each with two style frames, a 16-panel storyboard, a look and a production plan:

| | Direction | Idea | Pipeline |
|-|-----------|------|----------|
| A | One Line | One continuous ink line draws the whole film; every drive is a loop the line makes | code (2D ink engine) |
| B | Human-Sized | A handmade tabletop miniature world; the ancestral world fits on one table, the modern world runs off its edge | Blender Cycles, path-traced |
| C | The Wrong Painting | The figure is always cave-painted ochre and charcoal while the world repaints itself through art history into glossy CGI | image models + code compositing |
| D | Threads | Drives as threads of light that land in people or never land | WebGL, code-rendered |
| E | Match Cut | Each modern gesture cuts to the ancestral gesture it was built for | gen-video + Blender references |

## New companion film (concept round, 2026-09-27)

Maarten decided to make a completely new companion film instead of re-visualising this script: same message, 60–90 s, vertical first, near-wordless, one character and one turn. `concepts/` holds the ten concepts (`concepts.json`), the page builder and the built page. Shortlist: The Visitor, Care Instructions, The Night Watch.

## Layout
- `script.md`, `script.json` — the published script, 80 lines with timecodes.
- `beats.md` — the 16 beats and the canon locks every frame must respect.
- `directions/` — the five direction documents (logline, look, signature moments, shot list, production).
- `frames/<letter>/` — rendered style frames and storyboard panels (WebP).
- `kit/` — the procedural painter's manikin for three.js (`mannequin.js`), the headless render harness (`harness.html`, `shot.mjs`), GLB export for Blender (`export-glb.mjs`), and each direction's scene code in `kit/scenes/<letter>/`.
- `build_page.py`, `page_template.html`, `copy/` — build the review page (`page/index.html`) from all of the above.

## Rebuild
```
cd kit && npm install three playwright && python3 -m http.server 8765 --bind 127.0.0.1 &
node shot.mjs "harness.html?scene=scenes/D/p06.js" out.png 1280 720      # render one frame
ffmpeg -i ../../film.mp4 -vn -c:a libmp3lame -b:a 96k ../page/media/vo.mp3  # animatic soundtrack
python3 ../build_page.py
```
Blender frames use Blender 5.0 as a Python module (`pip install bpy` on Python 3.11), which includes Cycles with OpenImageDenoise. The Ubuntu `blender` package has no denoiser.
