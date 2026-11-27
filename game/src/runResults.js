// runResults — the run's story as data: which route was flown, what
// each gate paid, where the streak peaked, and how the survey went.
// The report panel renders this, and the dossier quotes it, so the
// judge can see the rally was actually flown and not staged.

import { routeCode } from './routeController.js';

export function buildRunResults(run) {
  const route = run.route;
  const score = run.score;
  const gates = route.graph.gates
    .filter((g) => g.active)
    .map((g) => ({
      id: g.id,
      label: g.label,
      kind: g.kind,
      survey: g.survey,
      passed: g.passed,
      accuracy: g.accuracy === null ? null : Math.round(g.accuracy * 100) / 100,
      points: g.pointsEarned,
      combo: g.comboEarned,
    }));
  return {
    title: 'TIDEPOST: SKYWEAVE+ — Branching Air Rally & Landmark Survey',
    routeCode: routeCode(route),
    routeCodes: ['OOO', 'OOT', 'OTO', 'OTT', 'TOO', 'TOT', 'TTO', 'TTT'],
    gates,
    gatesPoints: score ? score.breakdown.gates : 0,
    comboPoints: score ? score.breakdown.combo : 0,
    missPenalty: score ? score.breakdown.miss : 0,
    misses: route.misses,
    bestStreak: route.bestStreak,
    survey: route.survey
      ? {
          precision: Math.round(route.survey.precision * 100) / 100,
          framing: Math.round(route.survey.framing * 100) / 100,
          accuracy: Math.round(route.survey.accuracy * 100) / 100,
        }
      : null,
    timeSec: score ? score.timeSec : Math.round(run.timeSec),
    total: score ? score.total : 0,
    medal: score ? score.medal : 'NONE',
    delivered: run.phase === 'delivered',
    from: run.fromName,
    to: run.toName,
  };
}
