// shots — the four deterministic screenshot poses, taken through ?shot=N.
// Each pose puts the aircraft, the camera and the mission into a real,
// playable state and freezes the simulation, so a headless browser
// captures exactly what a player sees: a real render of the game's code.
// 1 cover — final approach to Pelican Bay; 2 takeoff from Mailhaven;
// 3 banked navigation toward the Cloudreach gate; 4 delivered at Pelican.

import { RUNWAYS, GATES } from './config.js';
import { headingForwardDeg } from './math3d.js';
import { runwayThreshold } from './world.js';
import { calculateDeliveryScore } from './scoringSystem.js';

export function parseShotParam() {
  const params = new URLSearchParams(window.location.search);
  const shot = Number(params.get('shot') || 0);
  return shot >= 1 && shot <= 4 ? shot : 0;
}

function placeOnApproach(run, runway, distanceM) {
  const threshold = runwayThreshold(runway);
  const fwd = headingForwardDeg(runway.headingDeg);
  const plane = run.plane;
  plane.pos = {
    x: threshold.x - fwd.x * distanceM,
    y: threshold.y + distanceM * GATES.glideSlope + 0.8,
    z: threshold.z - fwd.z * distanceM,
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
}

export function applyShotPose(run, camera, shot) {
  const plane = run.plane;
  if (shot === 1) {
    // Cover: on final to Pelican Bay, 500 m out — the approach gate (380 m
    // before the threshold) sits just ahead and the runway fills the frame.
    placeOnApproach(run, RUNWAYS.pelican, 500);
    run.phase = 'airborne';
    run.timerRunning = true;
    run.timeSec = 96;
    run.nav.gates[0].passed = true;
    run.nav.nextGateIndex = 1;
    camera.modeIndex = 0;
  } else if (shot === 2) {
    // Takeoff: rolling down Mailhaven, nose up, just about to lift.
    const runway = RUNWAYS.mailhaven;
    const fwd = headingForwardDeg(runway.headingDeg);
    plane.pos = {
      x: runway.center.x - fwd.x * (runway.lengthM / 2 - 180),
      y: runway.elevationM + 0.8,
      z: runway.center.z - fwd.z * (runway.lengthM / 2 - 180),
    };
    plane.headingDeg = runway.headingDeg;
    plane.pitchDeg = 10;
    plane.bankDeg = 0;
    plane.speedKt = 62;
    plane.throttle = 1;
    plane.flaps = false;
    plane.onGround = true;
    run.phase = 'ground';
    run.timerRunning = false;
    camera.modeIndex = 0;
  } else if (shot === 3) {
    // Navigation: banked 25 degrees toward the Cloudreach route gate,
    // 400 m out, the ring big ahead. The pose is computed from the gate
    // itself so it stays true if the gate ever moves.
    const gate = run.nav.gates[0];
    const from = RUNWAYS[run.mission.from];
    const dx = gate.pos.x - from.center.x;
    const dz = gate.pos.z - from.center.z;
    const legLen = Math.hypot(dx, dz);
    const ux = dx / legLen;
    const uz = dz / legLen;
    plane.pos = {
      x: gate.pos.x - ux * 400,
      y: gate.pos.y,
      z: gate.pos.z - uz * 400,
    };
    plane.headingDeg = (Math.atan2(dx, -dz) * (180 / Math.PI) + 360) % 360;
    plane.pitchDeg = 2;
    plane.bankDeg = 25;
    plane.speedKt = 82;
    plane.vsFpm = 120;
    plane.throttle = 0.78;
    plane.flaps = false;
    plane.onGround = false;
    plane.airborne = true;
    plane.airborneOnce = true;
    run.phase = 'airborne';
    run.timerRunning = true;
    run.timeSec = 61;
    camera.modeIndex = 0;
  } else if (shot === 4) {
    // Delivered: stopped on Pelican Bay with the report panel up.
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
    run.timeSec = 108;
    run.cargo.health = 96;
    run.landing = { kind: 'good', label: 'GOOD LANDING', reason: 'SOLID TOUCHDOWN, WELL FLOWN' };
    run.nav.gates.forEach((g) => { g.passed = true; });
    run.nav.nextGateIndex = run.nav.gates.length;
    run.score = calculateDeliveryScore(run);
    camera.modeIndex = 0;
  }
  camera.ready = false;
  return { freeze: true, showReport: shot === 4 };
}
