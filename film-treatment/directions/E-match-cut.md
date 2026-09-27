# DIRECTION E — MATCH CUT

**Logline.** A live-action short film built on the oldest device in cinema: the match cut. Each modern moment in one manikin's ordinary day cuts, on the same gesture, to the ancestral moment that gesture was built for. A thumb on a phone cuts to a thumb on a child's cheek. Fridge light at 2 a.m. cuts to firelight at night. A crowd of strangers cuts to walking with the band. The viewer feels the gap in a single cut.

**Why it fits.** The script's claim is that the drive is the same and only the world changed. A match cut is that sentence in film grammar: same body, same gesture, different world. It needs no diagrams. It follows one character, which is the strongest route to emotion for a general audience.

## Look
- Cinema: 2.39:1 anamorphic widescreen, 35 mm grain, soft halation.
- Modern world: handheld, documentary, cold blue-green practical light (screens, fluorescent tubes, street lamps).
- Ancestral world: locked-off wide lenses, golden firelight and dusk.
- The manikins act through posture alone. No faces needed.
- Split screen only at the key moments (mismatch, the hinge). At the end the split line dissolves and both worlds are in one frame.
- Type: tiny white small caps in the corner for chapter names. No infographics.
- Sound leads: a phone buzz becomes a crackling fire, office air conditioning becomes wind in grass. Every match cut is also a sound cut. Music enters late, on strings.

## Signature moments
1. **Wake.** A phone alarm at 6:00; the manikin's hand reaches to silence it. Cut on the same reach to a hand touching a sleeping companion's shoulder at dawn.
2. **Faces.** A thumb flicking through faces on a screen. Cut on the same motion to a thumb stroking an infant's cheek by the fire.
3. **The litany.** Seven match-cut pairs, faster and faster.
4. **The split.** At the hinge the frame splits. The modern self, alone, and the ancestral self, among people, turn to look at each other across the split line.
5. **The merge.** The split line dissolves into a new world where the best of both halves share one frame: a modern courtyard, a long table, a phone face down.

## Storyboard (16 panels, one per beat; most panels are a match-cut pair: modern shot / ancestral shot)
- **P01 OPEN.** (a) 6:00 a.m., blue dawn in a small modern bedroom: a manikin's hand reaching for a glowing phone on the nightstand. (b) The same hand, same angle, reaching to touch a sleeping companion's shoulder in a reed hut at dawn, warm light.
- **P02 NOT ANTI-TECH.** (a) Hands typing on a laptop in a dark room. (b) The same hands knapping a flint in the same rhythm, by a fire.
- **P03 HOW WE FEEL.** (a) A manikin alone in a fluorescent open-plan office at night, rows of empty desks. (b) Rain on a window of a night bus, a manikin's head against the glass.
- **P04 SELF-BLAME.** (a) A small bathroom at night, the manikin leaning on the sink, facing the mirror, one hand on its own chest. (b) Pull back: the bathroom is the only lit window in a huge dark apartment block.
- **P05 MISMATCH.** Split screen, one frame: left, hunched at a laptop at night; right, the same pose, sitting by a fire among others.
- **P06 HUMAN-SIZED.** (a) Golden hour: a band of manikins walking together through tall grass, a child carried on shoulders. (b) Night: a circle of manikins around a fire, close together.
- **P07 TUNED DRIVES.** (a) Around the fire, one manikin looks at another across the flames; a third watches. (b) The same glance, a manikin in bed looking at a dating-app-like screen of faces (generic, no brand).
- **P08 EVERYTHING CHANGED.** A single frame from a hyper-montage: the same manikin, looking up, standing in a vast server hall of blinking racks. (Label: one of 12 cuts, field → village → city → factory → office → screens → server hall.)
- **P09 THE LOOP.** (a) A hungry manikin reaching into a fruit tree. (b) The same manikin lying back in the grass, satisfied, eyes to the sky. The loop closed.
- **P10 LONELINESS.** (a) 2 a.m., a manikin at a kitchen table lit only by the open fridge and a phone. (b) Night, outside the camp: a lone manikin by a small fire, and another manikin sitting down beside it.
- **P11 IT IS EVERYTHING.** (a) A manikin in a car in a traffic jam at night, red tail lights. (b) The same pose: walking with the band across open country at sunrise.
- **P12 ON PURPOSE.** (a) A glass office at night: manikins watching a wall of dashboards. (b) On one screen, our manikin at its kitchen table, seen as a data point.
- **P13 NOT BROKEN.** Split screen: left, the modern manikin looking up from its phone, lit blue; right, its ancestral self by the fire, lit gold. They look toward each other across the split line.
- **P14 THE ANSWER.** (a) The phone set face down on the table. (b) The manikin opening the front door, warm light outside.
- **P15 THE NEW WORLD.** No split: a modern courtyard of timber and glass homes, kids playing, a long outdoor table full of manikins, a tram passing, solar roofs, evening sun.
- **P16 CLOSE.** (a) A fire pit in the modern courtyard at night, manikins around it, faces lit warm. (b) Back in the bedroom from P01: the hand now resting on another manikin's shoulder, the phone dark.

## Production
- Gen-video: Kling 3.0 (multi-shot, up to 12 references, 4K, consistent characters), Seedance 2.5 (up to 50 references, long takes), Veo 3.1 for 4K hero shots.
- Consistency: Claude renders a manikin reference sheet and the exact match-cut poses in Blender, and uses them as start and end frames for both halves of every pair, so the gesture matches to the frame.
- Edit, grade, sound and titles assembled by Claude in code (or handed to DaVinci Resolve).
- Cost: generation credits $400–1,000 including re-rolls; music $0–1,000. Time: 2–3 weeks.
- Risk: gen-video drift (proportions change, hands mutate) and the look many AI films share. Of the five, this is closest to the old film's photoreal surface, even though the grammar is completely different (motion, match cuts, no cards).

## Frame spec for this direction (overrides the shared deliverable sizes)
- Everything is 2.39:1 widescreen. Heroes: `hero-1.png`, `hero-2.png` at 1920x804. Hero-1 should be a match-cut pair shown as ONE split frame (left modern / right ancestral, same gesture) or the P13 split; hero-2 a single cinematic frame (for example the P15 courtyard or the P10 kitchen at 2 a.m.).
- Paired panels: render the two shots separately as `pNN-a.png` (modern) and `pNN-b.png` (ancestral or second shot) at 1280x536. Single-frame panels (P05, P08, P13, P15) are one file `pNN.png` at 1280x536.
- These frames are previz for a gen-video pipeline, but make them as cinematic as the tools allow: motivated practical light (screen glow, fridge light, firelight, dawn), haze, film grain, halation, shallow depth of field, a deliberate grade (cold modern, warm ancestral). The pairs must match in camera angle, framing and gesture so the cut reads.
