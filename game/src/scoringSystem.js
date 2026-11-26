// scoringSystem — the delivery score, out of 1000, rounded exactly once.
// Cargo 350 + landing 350 + time 200 + two route gates at 50 each.
// A crash scores the cargo that survived and nothing for the landing; a
// delivery that stops on the wrong runway keeps its gates and time but
// loses the landing points it never earned.

import { SCORING } from './config.js';
import { clamp } from './math3d.js';

export function medalFor(score, medals) {
  if (score >= medals.gold) return 'GOLD';
  if (score >= medals.silver) return 'SILVER';
  if (score >= medals.bronze) return 'BRONZE';
  return 'NONE';
}

export function calculateDeliveryScore(run) {
  const { mission, cargo, landing, timeSec, nav } = run;

  // Cargo: the fraction that arrived intact, out of 350.
  const cargoPoints = (SCORING.cargo * clamp(cargo.health, 0, 100)) / 100;

  // Landing: perfect 350, good 300, hard 180, crash or never landed 0.
  let landingPoints = 0;
  if (landing) landingPoints = SCORING.landingPoints[landing.kind] ?? 0;

  // Time: full 200 at par or better, sliding to 0 at the cap.
  let timePoints = 0;
  if (timeSec <= mission.parSec) timePoints = SCORING.time;
  else if (timeSec < mission.capSec) {
    timePoints = SCORING.time * (1 - (timeSec - mission.parSec) / (mission.capSec - mission.parSec));
  }

  // Gates: 50 each, only the ones actually flown through.
  const gatesPassed = nav.gates.filter((g) => g.passed).length;
  const gatePoints = gatesPassed * SCORING.gateEach;

  // Round exactly once, on the total.
  const total = Math.round(cargoPoints + landingPoints + timePoints + gatePoints);
  return {
    total: clamp(total, 0, SCORING.maxTotal),
    breakdown: {
      cargo: Math.round(cargoPoints),
      landing: landingPoints,
      time: Math.round(timePoints),
      gates: gatePoints,
      gatesPassed,
      gatesTotal: nav.gates.length,
    },
    timeSec: Math.round(timeSec),
    medal: medalFor(total, mission.medals),
    delivered: run.phase === 'delivered',
  };
}
