# Rocky's Pirate Army — by BajrangVerse Studios

Captain Rocky leads a growing army of pirates to win back the island's gold from greedy **Lord Lalchi**.
Drag to steer the army through the blue gates, pick up castaways (Golu, Pinky, Bunty…), dodge barrels, anchors and
narrow bridges, win pistol shoot-outs against Lalchi's red-coat guards, then line up at the fort and **tap to fire**:
bullets chip the walls, the guards on the walls shoot back, Rocky's cannon booms, and the fort comes down.

## Build
    npm install
    node tools/bake.mjs            # only when characters change (needs PEOPLE_SRC = folder with the CC0 packs)
    PROTECT=1 node build.mjs       # → www/ and ../pirateapp/src/main/assets (game.js obfuscated)
    cd .. && gradle :pirateapp:assembleRelease :pirateapp:bundleRelease

Tests (Playwright): `node test/play.mjs <level>` plays a level and saves screenshots; `node test/icon.mjs out.png 512`
renders the app icon.

## Code
- `src/main.js` game logic (levels, army, hazards, shoot-outs, the fort finale, shop, ads)
- `src/people.js` draws the animated people (instanced crowds + smoothly animated heroes) from `assets/people.bin`
- `tools/bake.js|mjs`, `tools/people.json` turn the characters into `people.bin` (colours, weapons, animations)
- `src/world.js` islands, winding path; `src/castle.js` the brick fort
- `src/audio.js` sound engine; `src/sfx.js` effects and voices; `src/music*.js` the music (made in a Web Worker)

## Credits
Characters: "Ultimate Animated Character Pack" and weapons from "Pirate Pack" by Quaternius (CC0).
Ads: Google AdMob — the IDs in the app are Google's TEST IDs; replace them with your own before publishing.
