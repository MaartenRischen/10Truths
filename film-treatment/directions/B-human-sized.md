# DIRECTION B — HUMAN-SIZED

**Logline.** A handmade tabletop world, shot macro, where 30 cm wooden manikins live. The film's central claim, that the world used to be human-sized, becomes physical: the ancestral world fits on one round table. The modern world grows past the table's edge into the dark studio, too big to see all at once. At the end, wooden hands build a new world that fits on the table again.

**Why it fits.** Painter's manikins are 30 cm tall, so their true-scale world is a miniature. Miniatures make scale meaningful: a world you can see whole versus a world that never ends. "Everything changed, except you" becomes a single camera move. It is also the most tactile option: wood, paper, felt and light. People trust handmade things and feel them.

## Look
- Macro cinematography: 100 mm macro lens, shallow depth of field (f/2.8 look), creamy bokeh, tilt-shift for top-down shots.
- Practical light only: warm tungsten work lamps, one "sun" lamp, a little haze. Later, cold LED screen light.
- Materials: the savanna is dyed jute and paper grass on a round wooden board; fire is amber resin with an LED; huts are woven reed; the sky is a painted backdrop. The modern world is cardboard, grey board, acrylic and brushed aluminium, with hundreds of tiny glowing screens. The new world is pale timber, glass, moss and warm windows.
- Motion: the manikins move in stepped stop-motion (12 fps), the camera moves smoothly (motion control, 24 fps). That mix is the signature of Laika and Wes Anderson's "Isle of Dogs".
- Scale as meaning: in the ancestral world the whole world fits in frame. As the world modernises, the camera keeps pulling back and the table cannot contain it. Cardboard towers run off the edge of the table, and city lights become fairy lights that go on into the dark.
- Sound: wooden clicks when manikins move, paper rustle, a music-box motif for the human-sized world that later detunes, warm strings.

## Signature moments
1. **Everything changed, except you.** A motion-control orbit around one standing manikin while, in stop-motion time-lapse, the diorama is rebuilt around it: huts, fields, brick, steel, glass, screens. The manikin never moves.
2. **Eight billion strangers.** The camera pulls back from one manikin at a tiny desk to reveal thousands of identical desks in rows across a vast warehouse floor, each manikin lit by a phone.
3. **Loop after loop.** A tabletop marble run: each need is a track that should end in a cup, but every track is diverted into an endless spiral. The marbles never land.
4. **The set is wrong.** The studio work lights snap on. We see C-stands, tape, the edge of the table. The manikin stands intact in the middle: "You are not broken."
5. **Human-sized again.** Wooden hands build a new world on the table: timber-and-glass homes around a shared garden, a long table, solar panels, a small tram. The camera rises and the whole new world fits in one frame again. Marbles land in cups everywhere.

## Storyboard (16 panels, one per beat)
- **P01 OPEN.** Macro on a manikin's wooden face and shoulder in darkness, one tungsten lamp warming up, dust in the beam. Its elbow joint pin catches the light. Behind it, out of focus, a vast dark model city with tiny lights running past the edge of the table.
- **P02 NOT ANTI-TECH.** A workbench close-up. Tiny tools laid out in a row like jewels: a flint hand-axe, a wooden wheel, a brass lens, a circuit board. A manikin hand rests on the flint.
- **P03 HOW WE FEEL.** A cardboard apartment block cut in section, like a dollhouse. Each small room has one manikin alone: in bed, at a desk, curled on a sofa lit by a phone. Cold light, lateral view.
- **P04 SELF-BLAME.** One manikin in a small bathroom set, facing a mirror, one hand on its chest. The room is subtly wrong: the door too tall, the ceiling too low.
- **P05 MISMATCH.** Top-down tilt-shift: a small round board of savanna grass with one manikin on it, placed in the middle of a vast grey grid of modern city blocks. It does not fit.
- **P06 HUMAN-SIZED.** The whole ancestral world on one round table: a fire in the middle, five manikins sitting close around it, a ring of reed huts, grass, a few figures walking in from the edge. Golden lamp light. Everything visible in one frame.
- **P07 TUNED DRIVES.** Macro at the fire: two manikin hands touching; one handing food to another; two heads leaning together; one sitting a little apart, head down; at the edge of the light, a stranger's silhouette.
- **P08 EVERYTHING CHANGED.** One manikin standing still at the center. Around it, the world in mid-rebuild: fields and a brick wall on one side, steel towers, antenna masts and glowing screens on the other. Motion blur on the set, the manikin sharp.
- **P09 THE LOOP.** Macro of a wooden marble dropping into a small wooden cup at the end of a short track. A manikin beside it, relaxed. The one closed loop in the film so far.
- **P10 LONELINESS.** Pull back: rows and rows of identical tiny desks stretching into darkness, each with a manikin lit by a phone. Thousands.
- **P11 IT IS EVERYTHING.** The marble machine: seven wooden tracks with small hand-lettered paper tags (TOUCH, REST, BODY, SAFETY, SEARCH, FOOD, STANDING), each track curling into an endless spiral, marbles mid-flight, the manikin in the middle of it.
- **P12 ON PURPOSE.** Behind the machine: a small coin-operated mechanism. Each spiral turns a crank that drops a coin into a box. A little price tag hangs from the manikin's wrist.
- **P13 NOT BROKEN.** Work lights on. The whole studio visible: C-stands, a lamp, gaffer tape, the table edge. The manikin stands intact at the center of the set in a pool of light.
- **P14 THE ANSWER.** A wooden hand moves a cardboard wall aside and lifts away a tower of glowing screens. Behind it, a window of daylight opens onto the set.
- **P15 THE NEW WORLD.** The new world on the table: pale timber and glass homes around a shared garden, a long outdoor table full of manikins, solar panels, a small tram, trees. Warm late light. It all fits in one frame.
- **P16 CLOSE.** Evening. The long table, lamps on, manikins close together. The camera pulls back through the studio door. On the workbench in the foreground, "demismatch.com" is carved into the wood.

## Production
- Blender, scripted entirely by Claude in Python: a procedural diorama kit (grass, huts, cardboard city, screens, marble runs) and the rigged manikin. Poses keyed pose-to-pose on twos, like real stop-motion.
- Rendered path-traced in Cycles on rented cloud GPUs (RunPod or Vast: an RTX 4090 costs about $0.35–0.70 an hour).
- Optional: gen-video (Kling 3.0 or Seedance 2.5) for organic inserts like fire and dust, using Blender frames as references.
- Cost: GPU rendering $150–600 for 4K; music $0–500. Time: 2–3 weeks.
- Risk: the most building. Dozens of miniature environments must be modelled and dressed. In return everything is consistent and controllable: no AI drift, no melting hands.
