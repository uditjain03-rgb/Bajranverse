# Rocky's Pirate Army — by BajrangVerse Studios

Captain Rocky leads a growing army of pirates to win back the island's gold from greedy **Lord Lalchi**.
Drag to steer the army through the blue gates (pick the better one for a 🔥 PERFECT combo), pick up castaways (Golu,
Pinky, Bunty…), grab gunpowder barrels for bigger bombs, dodge Lalchi's cannons (red circles), the slamming Kraken
arm, barrels, anchors and narrow bridges, fly over chasms on mega ramps, and bomb Lalchi's guard squads. At the
fortress (gatehouse, four towers, a keep) the army **throws bombs — tap to throw more**: blocks blow out of the walls,
guards on the walls and towers shoot back, Rocky's cannon booms, and the whole fortress comes down.

## Build
    npm install
    node tools/bake2.mjs           # only when characters change: serve the unpacked CC0 Quaternius packs (Universal Base
                                   # Characters, Modular Character Outfits - Fantasy, Universal Animation Library) at
                                   # http://localhost:8765/ (see tools/people2.json)
    PROTECT=1 node build.mjs       # → www/ and ../pirateapp/src/main/assets (game.js obfuscated)
    cd .. && gradle :pirateapp:assembleRelease :pirateapp:bundleRelease

Tests (Playwright): `node test/play.mjs <level>` plays a level and saves screenshots; `node test/icon.mjs out.png 512`
renders the app icon.

## Code
- `src/main.js` game logic (levels, army, hazards, shoot-outs, the fort finale, shop, ads)
- `src/people.js` draws the animated people (instanced crowds + smoothly animated heroes) from `assets/people.bin`
- `tools/bake2.js|mjs`, `tools/people2.json` turn the characters into `assets/people.bin` (outfits, heads, hair, hats,
  weapons, simplified for phones, animations); `tools/bake.js` is the older version for the first characters
- `src/world.js` islands, winding path; `src/castle.js` the brick fort
- `src/audio.js` sound engine; `src/sfx.js` effects and voices; `src/music.js` plays the recorded tracks in `assets/music`

## Credits
Characters: "Universal Base Characters", "Modular Character Outfits - Fantasy", "Universal Animation Library", hats from
"Ultimate Animated Character Pack" and weapons from "Pirate Pack", all by Quaternius (CC0).
Music: title and victory tunes by BajrangVerse Studios (recorded from Monster Mayhem Run); "Galway", "Achaidh Cheide",
"Pixel Peeker Polka - faster", "Life of Riley", "Run Amok", "Hyperfun" by Kevin MacLeod (incompetech.com), CC-BY 4.0.
Castle, trees, rocks and props: Quaternius Medieval Village / Stylized Nature / Fantasy Props MegaKits (CC0).
Studio logo: from Monster Mayhem Run.
Ads: Google AdMob — the IDs in the app are Google's TEST IDs; replace them with your own before publishing.
