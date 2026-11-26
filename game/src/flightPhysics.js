// flightPhysics — the arcade flight model. One function per frame:
// updateFlightDynamics moves the aircraft through the air, and reports a
// touchdown when the wheels meet the ground. Ground roll lives in
// groundPhysics.js; the mission controller decides what a touchdown means.
//
// Speeds in knots, angles in degrees, vertical speed in feet per minute —
// the units the HUD shows, so the numbers stay honest all the way through.

import { FLIGHT } from './config.js';
import { clamp, angleDiffDeg, headingForwardDeg } from './math3d.js';
import { updateGroundRoll } from './groundPhysics.js';

const KT_TO_MS = 0.514444;
const FPM_TO_MS = 0.00508;
const G = 9.81;

export function createAircraftState(mission, startRunway) {
  const f = headingForwardDeg(startRunway.headingDeg);
  const half = startRunway.lengthM / 2;
  return {
    pos: {
      x: startRunway.center.x - f.x * (half - 60),
      y: startRunway.elevationM + 0.8,
      z: startRunway.center.z - f.z * (half - 60),
    },
    headingDeg: startRunway.headingDeg,
    pitchDeg: 0,
    bankDeg: 0,
    speedKt: 0,
    vsFpm: 0,
    throttle: 0,
    flaps: false,
    onGround: true,
    fuel: mission.fuel,
    damage: 0,
    cargoHealth: 100,
    propSpinRad: 0,
    airborne: false,
  };
}

// input: { pitchAxis, rollAxis, yawAxis, brake } each -1..1 (brake 0/1).
// groundHeight: (x, z) => metres. Returns { event } where event is null,
// 'liftoff' or { type: 'touchdown', vsFpm, groundSpeedKt }.
export function updateFlightDynamics(plane, input, dt, groundHeight) {
  plane.propSpinRad += (2 + plane.throttle * 28) * dt;

  if (plane.onGround) {
    return updateGroundRoll(plane, input, dt, groundHeight);
  }

  const stallKt = plane.flaps ? FLIGHT.stallFlapKt : FLIGHT.stallCleanKt;
  const stalled = plane.speedKt < stallKt;
  const severity = stalled ? clamp((stallKt - plane.speedKt) / stallKt, 0, 1) : 0;
  const controlAuthority = stalled ? 0.45 : 1;

  // --- attitude ------------------------------------------------------------
  const sensitivity = plane.sensitivity ?? 1;
  plane.pitchDeg = clamp(
    plane.pitchDeg + input.pitchAxis * FLIGHT.pitchRateDegS * controlAuthority * sensitivity * dt,
    FLIGHT.pitchMinDeg,
    FLIGHT.pitchMaxDeg,
  );
  if (stalled) {
    // A stalled wing drops the nose: the pilot feels it before the HUD does.
    plane.pitchDeg = Math.max(plane.pitchDeg - 14 * severity * dt, -12);
  }
  const rollTarget = input.rollAxis * FLIGHT.bankMaxDeg;
  if (input.rollAxis !== 0) {
    const dir = Math.sign(rollTarget - plane.bankDeg);
    plane.bankDeg += dir * Math.min(Math.abs(rollTarget - plane.bankDeg), FLIGHT.rollRateDegS * controlAuthority * dt);
  } else {
    // Gentle auto-levelling when the stick is centred.
    const level = Math.sign(plane.bankDeg) * Math.min(Math.abs(plane.bankDeg), 10 * dt);
    plane.bankDeg -= level;
  }
  plane.bankDeg = clamp(plane.bankDeg, -FLIGHT.bankMaxDeg, FLIGHT.bankMaxDeg);

  // --- turn: banked lift turns the aircraft; rudder nudges the nose -------
  const speedMs = Math.max(plane.speedKt, 5) * KT_TO_MS;
  const turnRateDegS = (G * Math.tan(plane.bankDeg * (Math.PI / 180))) / speedMs * (180 / Math.PI);
  plane.headingDeg = (plane.headingDeg + turnRateDegS * dt + input.yawAxis * FLIGHT.yawRateDegS * 0.4 * dt + 360) % 360;

  // --- speed: throttle pulls toward its speed, pitch trades speed for height
  const speedTargetKt = plane.throttle * FLIGHT.hardCapKt - plane.pitchDeg * 0.9;
  const accel = speedTargetKt > plane.speedKt ? 9 : 12;
  const dv = clamp(speedTargetKt - plane.speedKt, -accel * dt, accel * dt);
  plane.speedKt = clamp(plane.speedKt + dv, 0, FLIGHT.hardCapKt);

  // --- vertical speed -------------------------------------------------------
  let vsFpm = plane.speedKt * 101.27 * Math.sin(plane.pitchDeg * (Math.PI / 180));
  if (stalled) {
    // Stall ceiling: the sink rate the wing allows, -600 .. -1500 fpm.
    const sinkCeiling = FLIGHT.stallSinkMinFpm + (FLIGHT.stallSinkMaxFpm - FLIGHT.stallSinkMinFpm) * severity;
    vsFpm = Math.min(vsFpm, sinkCeiling);
  }
  vsFpm = clamp(vsFpm, FLIGHT.descentMaxFpm, FLIGHT.climbMaxFpm);
  plane.vsFpm = vsFpm;

  // --- position -------------------------------------------------------------
  const fwd = headingForwardDeg(plane.headingDeg);
  const pitchRad = plane.pitchDeg * (Math.PI / 180);
  const horizMs = plane.speedKt * KT_TO_MS * Math.cos(pitchRad);
  plane.pos.x += fwd.x * horizMs * dt;
  plane.pos.z += fwd.z * horizMs * dt;
  plane.pos.y += vsFpm * FPM_TO_MS * dt;

  // --- ground contact -------------------------------------------------------
  const ground = groundHeight(plane.pos.x, plane.pos.z);
  if (plane.pos.y <= ground + 0.8) {
    plane.pos.y = ground + 0.8;
    const headingError = Math.abs(angleDiffDeg(plane.headingDeg, plane.runwayHeadingDeg ?? plane.headingDeg));
    const event = {
      type: 'touchdown',
      vsFpm: plane.vsFpm,
      groundSpeedKt: plane.speedKt,
      headingErrorDeg: headingError,
      bankDeg: Math.abs(plane.bankDeg),
      onRunway: plane.overRunway === true,
    };
    plane.onGround = true;
    plane.airborne = false;
    plane.vsFpm = 0;
    return { event };
  }
  return { event: null };
}
