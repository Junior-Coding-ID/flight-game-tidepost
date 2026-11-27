// shots — the four deterministic screenshot poses, taken through ?shot=N.
// Each pose puts the aircraft, the camera and the mission into a real,
// playable state and freezes the simulation, so a headless browser
// captures exactly what a player sees: a real render of the game's code.
// 1 Choose Your Route — approaching Fork 01, both branch gates ahead,
//    the fork banner up. 2 Landmark Survey — at the Fork 03 survey gate,
//    the Pelican Bay lighthouse framed ahead. 3 Precision Finish —
//    through the final approach gate toward Pelican Bay. 4 Run Results —
//    delivered at Pelican Bay with the rally report panel up.

import { RUNWAYS, GATES } from './config.js';
import { headingForwardDeg } from './math3d.js';
import { runwayThreshold } from './world.js';
import { calculateDeliveryScore } from './scoringSystem.js';
import { framingAccuracy, lighthousePosition } from './surveyEvaluator.js';

export function parseShotParam() {
  const params = new URLSearchParams(window.location.search);
  const shot = Number(params.get('shot') || 0);
  return shot >= 1 && shot <= 4 ? shot : 0;
}

function placeBefore(run, targetPos, headingDeg, distanceM, altitudeM, speedKt) {
  const f = headingForwardDeg(headingDeg);
  const plane = run.plane;
  plane.pos = {
    x: targetPos.x - f.x * distanceM,
    y: altitudeM,
    z: targetPos.z - f.z * distanceM,
  };
  plane.headingDeg = headingDeg;
  plane.pitchDeg = -2;
  plane.bankDeg = 0;
  plane.speedKt = speedKt;
  plane.vsFpm = -180;
  plane.throttle = 0.62;
  plane.flaps = false;
  plane.onGround = false;
  plane.airborne = true;
  plane.airborneOnce = true;
}

// Mark gates as flown the way a real run would have: exactly the gates
// in flownIds, in route order, with honest accuracies, so the HUD route
// code and the report read true. Branch gates not chosen go inactive;
// a fork still open (choices[i] null) keeps both branches live.
function markFlown(run, flownIds, choices, accuracies) {
  const route = run.route;
  const byId = new Map(route.graph.gates.map((g) => [g.id, g]));
  const branchIds = ['O01', 'T01', 'O02', 'T02', 'O03', 'T03'];
  for (const id of branchIds) {
    const g = byId.get(id);
    if (!g) continue;
    const fork = g.fork;
    if (choices[fork] === null || choices[fork] === undefined) {
      g.active = true;
      continue;
    }
    g.active = choices[fork] === g.branch;
  }
  route.committed = [...choices];
  let streak = 0;
  for (const id of flownIds) {
    const g = byId.get(id);
    if (!g) continue;
    const a = accuracies[id] ?? 0.9;
    g.passed = true;
    g.accuracy = a;
    g.pointsEarned = Math.round(g.kind === 'technical' ? 18 + 200 * a : 100 + 100 * a);
    g.comboEarned = a >= 0.8 ? 10 * Math.min(streak, 5) : 0;
    if (a >= 0.8) streak += 1;
    else streak = 0;
  }
  route.streak = streak;
  route.bestStreak = streak;
  route.slotIndex = 9; // rally complete unless the caller re-opens a slot
}

export function applyShotPose(run, camera, shot) {
  const plane = run.plane;
  const route = run.route;
  const graph = route.graph;
  const legHeading = graph.legHeadingDeg;
  if (shot === 1) {
    // Choose Your Route: 350 m before the Fork 01 midpoint, both branch
    // gates ahead, the banner up, route still open.
    const fork = graph.forks[0];
    route.forkAnnounced[0] = true;
    placeBefore(run, fork.midpoint, legHeading, 350, fork.midpoint.y, 78);
    run.phase = 'airborne';
    run.timerRunning = true;
    run.timeSec = 34;
    run.nav.gates.find((g) => g.id === 'S1').passed = true;
    run.nav.gates.find((g) => g.id === 'S2').passed = true;
    route.slotIndex = 2;
    route.streak = 2;
    camera.modeIndex = 0;
  } else if (shot === 2) {
    // Landmark Survey: 300 m before the Fork 03 midpoint, heading split
    // between the survey gates and the lighthouse so both are in frame.
    const fork = graph.forks[2];
    const light = lighthousePosition();
    const toLight = Math.atan2(light.x - fork.midpoint.x, -(light.z - fork.midpoint.z)) * (180 / Math.PI);
    const heading = (legHeading + ((toLight - legHeading + 540) % 360 - 180) * 0.65 + 360) % 360;
    placeBefore(run, fork.midpoint, heading, 200, fork.midpoint.y, 74);
    run.phase = 'airborne';
    run.timerRunning = true;
    run.timeSec = 88;
    markFlown(run, ['S1', 'S2', 'O01', 'S3', 'T02'], ['O', 'T', null], { S1: 0.94, S2: 0.9, O01: 0.88, S3: 0.92, T02: 0.86 });
    // Re-open the survey fork: the pose is *at* the choice, not past it.
    route.slotIndex = 6;
    route.committed = ['O', 'T', null];
    route.forkAnnounced[2] = true;
    const fwd = headingForwardDeg(heading);
    run.surveyFraming = framingAccuracy(
      { x: fwd.x, y: 0, z: fwd.z },
      plane.pos,
      light,
    );
    camera.modeIndex = 0;
  } else if (shot === 3) {
    // Precision Finish: on final through the approach gate, Pelican Bay
    // ahead, the full TTT route behind the aircraft.
    const runway = RUNWAYS.pelican;
    const threshold = runwayThreshold(runway);
    const fwd = headingForwardDeg(runway.headingDeg);
    plane.pos = {
      x: threshold.x - fwd.x * 500,
      y: threshold.y + 500 * GATES.glideSlope + 0.8,
      z: threshold.z - fwd.z * 500,
    };
    plane.headingDeg = runway.headingDeg;
    plane.pitchDeg = -3;
    plane.bankDeg = 0;
    plane.speedKt = 65;
    plane.vsFpm = -420;
    plane.throttle = 0.45;
    plane.flaps = true;
    plane.onGround = false;
    plane.airborne = true;
    plane.airborneOnce = true;
    run.phase = 'airborne';
    run.timerRunning = true;
    run.timeSec = 118;
    markFlown(run, ['S1', 'S2', 'T01', 'S3', 'T02', 'S4', 'T03', 'S5'], ['T', 'T', 'T'], {
      S1: 0.95, S2: 0.91, T01: 0.88, S3: 0.93, T02: 0.9, S4: 0.94, T03: 0.87, S5: 0.92,
    });
    // The survey happened at Fork 03 on the T03 gate: its accuracy is
    // the effective survey accuracy, not the raw pass precision.
    route.survey = { precision: 0.87, framing: 0.72, accuracy: 0.8 * 0.87 + 0.2 * 0.72 };
    const t03 = route.graph.gates.find((g) => g.id === 'T03');
    if (t03) {
      t03.accuracy = route.survey.accuracy;
      t03.pointsEarned = Math.round(18 + 200 * t03.accuracy);
    }
    route.slotIndex = 8; // only the finish gate (S6) remains
    camera.modeIndex = 0;
  } else if (shot === 4) {
    // Run Results: stopped on Pelican Bay with the rally report up.
    const runway = RUNWAYS.pelican;
    plane.pos = {
      x: runway.center.x,
      y: runway.elevationM + 0.8,
      z: runway.center.z,
    };
    plane.headingDeg = runway.headingDeg;
    plane.pitchDeg = 0;
    plane.bankDeg = 0;
    plane.speedKt = 0;
    plane.throttle = 0;
    plane.flaps = true;
    plane.onGround = true;
    run.phase = 'delivered';
    run.timerRunning = false;
    run.timeSec = 132;
    run.cargo.health = 97;
    run.landing = { kind: 'good', label: 'GOOD LANDING', reason: 'SOLID TOUCHDOWN, WELL FLOWN' };
    markFlown(run, ['S1', 'S2', 'T01', 'S3', 'T02', 'S4', 'T03', 'S5', 'S6'], ['T', 'T', 'T'], {
      S1: 0.95, S2: 0.91, T01: 0.88, S3: 0.93, T02: 0.9, S4: 0.94, T03: 0.87, S5: 0.92, S6: 0.96,
    });
    route.survey = { precision: 0.87, framing: 0.72, accuracy: 0.8 * 0.87 + 0.2 * 0.72 };
    // The survey gate's own accuracy is the effective one.
    const t03 = route.graph.gates.find((g) => g.id === 'T03');
    if (t03) {
      t03.accuracy = route.survey.accuracy;
      t03.pointsEarned = Math.round(18 + 200 * t03.accuracy);
    }
    run.score = calculateDeliveryScore(run);
    camera.modeIndex = 0;
  }
  camera.ready = false;
  return { freeze: true, showReport: shot === 4 };
}
