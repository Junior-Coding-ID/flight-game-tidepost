# TIDEPOST: SKYWEAVE+ — Branching Air Rally & Landmark Survey

[![TIDEPOST: SKYWEAVE+ rank](https://make.fun/badge/best-flight-game-20261126-0057/Junior-Coding-ID/flight-game-tidepost/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![TIDEPOST: SKYWEAVE+ reward](https://make.fun/badge/best-flight-game-20261126-0057/Junior-Coding-ID/flight-game-tidepost/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Best Flight Game bounty](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A complete, original flight game that plays offline in a desktop browser from static files. Fly the Tidewing bush plane from Mailhaven to Pelican Bay in a branching air rally: one track, twelve checkpoints, three exclusive forks, eight routes.

## The rally

- **12 checkpoints, 9 flown per run** — 6 shared Open gates plus one branch gate per fork (3 forks × Open/Technical). Route codes OOO–TTT.
- **The fork's bet** — Open ring: wide cyan circle, 44 m across, 100 + 100a points. Technical octagon: narrow amber vertical octagon, 26 × 32 m, hitbox follows its actual size, 18 + 200a points. Technical only wins above **82% accuracy**. The branch you don't take goes dim (opacity 0.2) and stays out of the way.
- **Combo** — +10 per prior clean gate in the streak (max +50 a gate) when accuracy ≥ 80%.
- **Miss** — −40 points and a mandatory retry through a Safe-Approach Respawn 150 m before the gate (R for an instant one). Two consecutive fails skip the gate for 0 points (−80 total). No auto-advance on the first miss, no finish bonus.
- **Landmark Survey (Fork 03)** — frame the Pelican Bay lighthouse as you pass the survey gate. Effective accuracy A = 0.8P + 0.2F (pass precision P, framing F).
- **Best possible run** — 9 gates, all Technical at 100% with a full streak: 2,154 points. Medals: bronze 1400, silver 1800, gold 2050. A run lasts 90–150 seconds.

## Play

Open `game/index.html` in desktop Chrome. Keyboard and mouse, no network.

| Key | Action |
| --- | --- |
| W / S | Pitch down / up |
| A / D | Roll left / right |
| Q / E | Rudder |
| I / K | Throttle up / down |
| F | Flaps |
| B / Space | Brakes |
| C / V | Camera mode / reset view |
| M | Minimap on / off |
| R | Respawn after a miss (hold R to restart) |
| Esc / P | Pause |
| H | Help |

The HUD shows altitude, speed and heading on the tape, the next gate with bearing and distance, the route code, streak, misses, and the fork banner ("FORK 0X/03 — CHOOSE ONE") with the survey framing meter at the last fork.

## How it is built

Canvas 2D software renderer — the same stack as v1 (flat-shaded triangles painted back to front on a 2D canvas, no WebGL, no library, no textures). Node 22 program at `main.ts` copies `game/` and `screenshots/` into the output directory, writes `entry.txt`, and writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts` (the kit's file, unchanged).

The files the dossier highlights:

- `game/src/routeGraph.js` — the 12-checkpoint graph: spine, forks, survey gates.
- `game/src/routeController.js` — forks, misses, retries, Safe-Approach Respawn.
- `game/src/gateGeometry.js` — circle vs octagon hit tests, precision.
- `game/src/surveyEvaluator.js` — lighthouse framing, A = 0.8P + 0.2F.
- `game/src/scoringSystem.js` — Open 100+100a, Technical 18+200a, combo, miss.
- `game/src/hudRenderer.js` — instruments plus the fork banner and survey meter.
- `game/src/runResults.js` — the run's story: route code, per-gate table, survey.

## Screenshots

Real renders of the game's own code (headless Chromium, 1280×720, `?shot=N` pose harness in `game/src/shots.js`):

1. `1-choose-your-route.png` — approaching Fork 01, both branch gates ahead, banner up.
2. `2-landmark-survey.png` — at the Fork 03 survey gate, lighthouse framed.
3. `3-precision-finish.png` — through the final approach gate toward Pelican Bay.
4. `4-run-results.png` — delivered at Pelican Bay with the rally report.

## License

MIT — see `LICENSE`.
