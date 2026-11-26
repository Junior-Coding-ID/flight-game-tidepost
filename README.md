# TIDEPOST — Island Airmail

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/junior-coding-id/flight-game-tidepost/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/junior-coding-id/flight-game-tidepost/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

**Pulau kecil. Kiriman penting. Satu pesawat.**

TIDEPOST is a bush-flight delivery arcade game: fly the Tidewing T-01
single-engine bush plane between three islands in a fictional 8×8 km
archipelago at golden hour, deliver the mail, and land gently enough that
the cargo — and your score — survives.

## The game

- **Three missions, three islands, three runways:** Mailhaven, Pelican Bay
  (lighthouse), and Cloudreach (cliff-top weather station, 130 m up).
  - **M01 First Post** (Easy) — mail sacks, Mailhaven → Pelican Bay.
  - **M02 Fragile Cargo** (Medium) — ceramics, Pelican Bay → Cloudreach.
  - **M03 Last Light Express** (Hard) — priority mail, Cloudreach → Mailhaven.
- **A real flight model, arcade-tuned:** stall speeds (42 kt clean, 34 kt
  flap), pitch −18°…+20°, bank ±50°, climb/descent limits, a stall that
  drops the nose and sinks the wing, flaps, brakes, and a ground roll with
  rotate speed.
- **Navigation that matters:** a route gate on the extended centreline and
  a tight 22 m approach gate on the 0.065 glide slope, with a heading tape,
  bearing/distance readout, minimap, and alignment/glide needles.
- **Scoring out of 1000:** cargo 350 + landing 350 + time 200 + two gates
  at 50 each, with bronze/silver/gold medals per mission. A landing is
  judged on vertical speed, ground speed, heading error and bank — and a
  crash tells you exactly why ("TOUCHDOWN TOO FAST — 89 KT").
- **Fuel and damage turn a sortie into decisions:** burn fuel with the
  throttle, mind the gauge, and keep the cargo intact.
- **Chase view, low-poly 3D, no libraries:** a software renderer draws
  flat-shaded terrain, sea, sky, runways, landmarks, clouds and the
  Tidewing itself on a plain canvas. No network requests, no remote fonts
  or textures — everything is a file in `game/`.

## Controls (keyboard alone flies every mission)

| Keys | Action |
| --- | --- |
| W / S | Pitch down / up |
| A / D | Roll left / right — bank to turn |
| Q / E | Rudder |
| I / K | Throttle up / down |
| F | Flaps |
| B / Space | Brakes on the ground |
| C / V | Camera mode / reset view |
| M | Minimap on / off |
| Mouse | Hold left = virtual stick, wheel = throttle, right-drag = look around |
| Esc / P | Pause · R (hold) — restart · H — help |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step: `game/index.html` opens in desktop Chrome and plays
offline. Screenshots of the four key moments are in `screenshots/`
(cover first); `?shot=1..4` freezes the matching posed frame.

## Structure

The source is split into one-job modules under `game/src/` — flight
physics (`flightPhysics.js`, `groundPhysics.js`), landing judgement
(`landingEvaluator.js`), cargo and fuel (`cargoCondition.js`,
`aircraftResources.js`), the chase camera (`chaseCamera.js`), the world
(`terrainGenerator.js`, `world.js`, `worldRenderer.js`), navigation
(`navigationSystem.js`), missions and scoring (`missionController.js`,
`scoringSystem.js`), HUD and minimap (`hudRenderer.js`,
`minimapRenderer.js`), presentation (`presentationSystem.js`), input,
procedural audio, and particles.

## License

MIT — see [LICENSE](LICENSE).
