// scoringSystem — the SKYWEAVE+ rally score, rounded exactly once.
// Per gate: Open 100 + 100a, Technical 18 + 200a, where a is the pass
// accuracy (1 dead centre, 0 at the rim; survey gates use the effective
// accuracy A = 0.8P + 0.2F). Technical only wins above 82% accuracy:
// that is the fork's whole decision. Combo: +10 per prior clean gate in
// the streak (max +50 a gate) when a >= 80%. Miss: -40 a miss, with a
// mandatory retry; two consecutive fails skip the gate for 0 points.
// No finish bonus: the rally is the score.
//
// The theoretical best run is 9 gates, all Technical at 100% with a
// full streak: 6 shared Open (200 each) + 3 Technical (218 each) +
// combo 300 = 2,154. Medals: bronze 1400, silver 1800, gold 2050.

import { SCORING } from './config.js';
import { clamp } from './math3d.js';

export function medalFor(score, medals) {
  if (score >= medals.gold) return 'GOLD';
  if (score >= medals.silver) return 'SILVER';
  if (score >= medals.bronze) return 'BRONZE';
  return 'NONE';
}

export function gateBasePoints(kind, accuracy) {
  const a = clamp(accuracy, 0, 1);
  return kind === 'technical'
    ? SCORING.techBase + SCORING.techPerAccuracy * a
    : SCORING.openBase + SCORING.openPerAccuracy * a;
}

export function comboFor(priorStreak, accuracy) {
  if (accuracy < SCORING.comboMinAccuracy) return 0;
  return SCORING.comboPerStreak * Math.min(priorStreak, 5);
}

export function calculateDeliveryScore(run) {
  const { mission, route } = run;
  const gates = route.graph.gates.filter((g) => g.active);
  let gatePoints = 0;
  let comboPoints = 0;
  let gatesPassed = 0;
  for (const g of gates) {
    if (!g.passed) continue;
    gatesPassed += 1;
    gatePoints += g.pointsEarned;
    comboPoints += g.comboEarned;
  }
  const missPenalty = route.misses * SCORING.missPenalty;

  // Round exactly once, on the total.
  const total = Math.round(gatePoints + comboPoints - missPenalty);
  return {
    total: clamp(total, 0, 9999),
    breakdown: {
      gates: Math.round(gatePoints),
      combo: comboPoints,
      miss: -missPenalty,
      misses: route.misses,
      gatesPassed,
      gatesTotal: route.graph.flownCount,
      routeCode: route.committed.join(''),
      bestStreak: route.bestStreak,
      survey: route.survey,
    },
    timeSec: Math.round(run.timeSec),
    medal: medalFor(total, mission.medals),
    delivered: run.phase === 'delivered',
  };
}
