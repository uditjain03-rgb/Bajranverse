# Bajrangverse Mobile Games

| Game | Folders | Notes |
|---|---|---|
| Rocky's Pirate Army | `pirate-src/` (game, web build) · `pirateapp/` (Android) | Runner with an army, castle finale, treasure map |
| Splash Racer | `drive-src/` (shared drive engine) · `splashapp/` (Android) | Boat racing, Splash Rescue mode |
| Mad Taxi Masti | `drive-src/` (shared drive engine) · `taxiapp/` (Android) | City taxi: jobs, MAD MAX and RACE modes |
| Monster Mayhem Run | `monster-mayhem-run/` | The released v15 web game (built files from the owner's APK) |
| Monster Roll Rampage | — | Source lost from the build machine; restore from the v5.1 APK (see below) |

Apps (non-games) live in `uditjain03-rgb/Bajranverse-MobileApss`.

Never commit signing keys (`play-upload-key/`), `K.java` files or build outputs (`deliver/`); they are git-ignored.

## Monster Roll Rampage
Its source (`roll-src/`, `rollapp/`) was never committed and is no longer on the build machine. The released
`MonsterRollRampage-v5.1.apk` / `-playstore.aab` were delivered in chat on 2026-11-03; the game inside the APK
(`assets/index.html`, `assets/game.js`) can be restored into `monster-roll-rampage/` the same way as Monster Mayhem Run.
