# Demismatch shorts — series rules (all four films)

The long film ("You Are Not Broken", 5:26) explains the idea. These shorts make someone FEEL it in about a minute: they recognise themselves, feel relief that it isn't their fault, and click through. Audience: someone scrolling on a phone who has never heard the word "mismatch". Same message as Demismatch: modern distress is a healthy organism giving accurate signals in a world that doesn't fit it; the answer is a world built to fit humans, with modern tools (never "go back").

## Form
- Vertical 9:16. Animatic resolution 720x1280 (finals later at 1080x1920 or 4K).
- 60–80 seconds including a 4.5 s end card.
- Close to no words: no voice-over, no captions. The only text is diegetic (a clock, a phone notification, a printed card) and the series end card (film/text.js endCardShot).
- One character and one turn. Emotion comes from posture, timing, holds and sound. Manikins have no faces: let the head angle, the shoulders and stillness do the acting.
- Must work with the sound off (the story reads from pictures alone) and land harder with it on.

## Look
- Painter's manikins (kit/mannequin.js via E's lib/figs.js `figure()`), beech for the main character (seed 5). Other people: beech/maple/ash/oak variations only (no dark "skin-tone" coding).
- Real-scale modern sets and practical light, shot like intimate cinema: motivated light (lamps, screens, fridge, fire, dawn), shallow depth of field where it helps, grain, halation. Grades from E's GRADES: modern (cold), ancestral, fire, newworld (warm). Let the grade warm as the film resolves.
- STOP-MOTION: 12 fps, pose-to-pose, with a little per-frame boil (engine.js boil()). Movement should feel like a skilled stop-motion animator: anticipation, holds, overlap (head leads, body follows), weight. Never float; feet and seats must be planted.
- Camera: mostly locked-off frames composed for vertical (doorways, windows, full figures, stacked depth). Slow motivated moves only (a dolly of a few cm, a pan to follow a walk). NO Ken Burns zooms or push-ins on static images. Every shot needs something moving that matters.
- Cuts land on actions. Match cuts must match pose, framing and screen position exactly.

## Sound (film/audio.py cue sheet)
- Temp score: felt piano + soft pad, sparse, 60–72 bpm, in a key that suits the film. Enters late or leaves space; silence at the turn.
- Foley sells the manikins: wooden clicks/clacks on key contacts (sparingly), room tone, the specific sounds each script names.
- End card: music resolves; card holds in near silence.

## Canon locks
- Pro-technology: the new world and the fixes are modern (phones, neighbours, trams, courtyards). Never a cabin, never "go back". The ancestral world is where the drive was built, shown with respect (it had hardship), not as the destination.
- Never depict therapy, pills or doctors as the problem. No suicidality.
- No real human faces or bodies. No brands or logos. Generic UI only.
