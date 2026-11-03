# Buccaneer Bash

A third game by BajrangVerse Studios (Android package `com.bajrangverse.buccaneerbash`, module `:pirateapp`; working title was Pirate Rush: Fort Crash). It is completely separate from Monster Mayhem Run and Monster Roll Rampage: its own concept, characters, worlds, music, look and code (it shares only three.js and the small sound engine in `../game-src`).

## The game
- **Story:** Captain Goldtooth (eyepatch, big red beard, a gold tooth and Biscuit the parrot) leads a crew of funny pirates across tropical islands to storm the sea fort of Admiral Snootington (white curly wig, huge hat, big red nose).
- **Characters** (`src/crew.js`) are smooth-shaded cartoon humans with faces:
  - Eyes with irises and a shine, eyebrows, noses, ears, hair, stubble, beards and moustaches.
  - Expressions they switch between: a grin, a shouting open mouth when charging, and a surprised "O" when knocked flying.
  - The Captain and the Admiral also blink, turn their heads and gesture.
  - Every pirate has his own vest colour, skin tone and hair colour.
  - Crowd members are built lighter (fewer polygons), so 200+ stay fast.
- **One control:** drag left and right to steer the whole crew.
- **Gates:** two gates side by side. Blue gates add or multiply the crew (+12, ×2, ×3); red gates take pirates away (−5, ÷2). Pick the better side.
- **Castaways:** stranded pirates wave by the path and join the crew.
- **Hazards** (one new hazard per level, each with a warning banner):
  - Rolling barrels.
  - Narrow plank bridges over the sea: pirates outside the planks fall in.
  - Navy guards: pirates and guards knock each other away one for one, so the bigger side wins.
  - Spinning masts.
  - Swinging anchors.
- **Gold coins** along the path.
- **Finale, the siege:**
  - The crew lines up in front of the fort, and you TAP TAP TAP to send pirates charging (they also go slowly by themselves).
  - The Admiral paces the wall shouting "FIRE!" and "STOP THEM!", shaking his fist.
  - His two cannons lob cannonballs at the crew; a red circle shows where they land.
  - When the fort falls, the Admiral yells "Mama!", tumbles into the sea with a huge splash, and rows away in a tiny boat shaking his fist ("I'll be baaack!").
  - Captain Goldtooth climbs the rubble and raises the Jolly Roger, the treasure chest bursts open with gold, the crew cheers, and fireworks go off.
  - The fort is built from about 470 real bricks. Each charge knocks bricks flying, and unsupported bricks fall.
  - When the fort's strength reaches zero it crumbles in slow motion, the roofs and flags fall, and the Admiral flies off.
  - Every 5th level is a bigger fort.
- **Stars** come from how many pirates are left.
- **Worlds** (5 levels each, then they repeat). Beach, harbour and coral levels have wooden boardwalks and rope fences, and every world has ships at sea, circling gulls and moving waves:
  - Treasure Beach.
  - Jungle Isle.
  - Frosty Harbor.
  - Volcano Isle.
  - Coral Cove.
  - Moonlight Bay (night).
- **The paths wind and roll over hills.** `src/world.js` bends the straight game world in the shaders.
- **Shop and rewards:**
  - Upgrades: Bigger Crew and Treasure Hunter.
  - Crew hats that every pirate wears: tricorns, straw hats, party hats, crowns, skull caps.
  - A 7-day treasure gift.
- **Ads (Google AdMob):**
  - Optional rewarded ads: "+10/+15 pirates and keep going" and "double coins".
  - A short interstitial at most every 3 levels, from level 5 on.
  - **The IDs in the app are Google's public test IDs.** Before publishing, replace the app ID in `pirateapp/src/main/AndroidManifest.xml` and the two ad unit IDs at the top of `MainActivity.java` with your own AdMob IDs.

## Code
- `src/main.js`: levels, the crew, hazards, guard fights, the fort finale, screens, ads, input, camera.
- `src/crew.js`: the characters.
  - Pirates are instanced: body, skin, two arms and two legs that swing when they run.
  - Captain Redbeard, the navy guards and the Admiral.
- `src/world.js`: the six island worlds, the bent path, props and the sea.
- `src/castle.js`: the brick fort with simple brick physics.
- `src/sfx.js`: this game's own sound.
  - A sea-shanty band (squeezebox chords, fiddle tune, tuba bass, foot stomps, 6/8 swing) with a tune per world plus title, fight and win tunes.
  - A small speech synthesiser for the voices: "Arrr!", "Yo-ho!", "Charge!", "Hooray!", "Ahoy!", "Halt!", "Fire!", "Stop!", "Nooo!", "Mama!".
  - Effects: Biscuit's squawk, cannons, whistling cannonballs, splashes, bricks, coins, seagulls.

## Build
    node pirate-src/build.mjs            # -> pirate-src/www and pirateapp/src/main/assets (obfuscated)
    DEV=1 node pirate-src/build.mjs      # readable build for testing
    ./gradlew :pirateapp:assembleRelease :pirateapp:bundleRelease

Sign the outputs with `play-upload-key/pirate-rush-upload.jks` (alias `piraterush`; the key was made under the working title). The password is in the file next to it. Never commit that folder.

## Code protection
- The release build passes the game bundle through `javascript-obfuscator` (`../game-src/protect.mjs`), and R8 shrinks the Java side.
- The game refuses to run if someone hosts a copy on a website.
- No app's code can be made impossible to copy, but this makes reuse hard.

## Tests
- `node pirate-src/test/shoot.mjs <outdir> <plan>` takes headless screenshots. Steps include `open`, `play`, `warp:N`, `level:N`, `wait:S`, `shot:name` and `eval:expr`.
- `node pirate-src/test/icon.mjs <out.png>` renders the launcher icon.
- `node pirate-src/test/lineup.mjs <out.png>` shows all the characters side by side.

## Play Store
- Category: Game → Casual.
- Contains ads, so declare "Contains ads" and fill in the Data safety form for the AdMob SDK.
- A privacy policy URL is required.
- No violence beyond cartoon slapstick.
