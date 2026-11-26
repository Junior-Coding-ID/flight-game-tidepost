// groundPhysics — what the wheels do: takeoff roll, landing rollout and
// stopping. On the ground the bank is locked at zero, pitch is the nose
// wheel lifting (0-12 deg at 25 deg/s), and the aircraft steers with the
// rudder pedals. Liftoff happens at rotate speed with the nose up.

import { FLIGHT } from './config.js';
import { clamp, headingForwardDeg } from './math3d.js';

const KT_TO_MS = 0.514444;

// input: { pitchAxis, rollAxis, yawAxis, brake }.
// Returns { event } where event is null, 'liftoff' or 'stopped'.
export function updateGroundRoll(plane, input, dt, groundHeight) {
  plane.propSpinRad += (2 + plane.throttle * 28) * dt;
  plane.bankDeg = 0;

  // --- nose attitude on the ground -----------------------------------------
  if (input.pitchAxis > 0) {
    plane.pitchDeg = clamp(
      plane.pitchDeg + FLIGHT.groundPitchRateDegS * dt,
      0,
      FLIGHT.groundPitchMaxDeg,
    );
  } else if (input.pitchAxis < 0) {
    plane.pitchDeg = clamp(plane.pitchDeg - FLIGHT.groundPitchRateDegS * dt, 0, FLIGHT.groundPitchMaxDeg);
  } else if (plane.speedKt < 5) {
    plane.pitchDeg = Math.max(0, plane.pitchDeg - FLIGHT.groundPitchRateDegS * dt);
  }

  // --- speed: throttle pushes, drag and brakes pull back --------------------
  const accelKtS = plane.throttle * 24 - FLIGHT.rollingDragKtS;
  plane.speedKt = Math.max(0, plane.speedKt + accelKtS * dt);
  if (input.brake) {
    plane.speedKt = Math.max(0, plane.speedKt - FLIGHT.brakeDecelKtS * dt);
  }
  plane.speedKt = clamp(plane.speedKt, 0, FLIGHT.hardCapKt);

  // --- steering: rudder only bites while rolling ----------------------------
  const steerAuthority = clamp(plane.speedKt / 30, 0, 1);
  plane.headingDeg =
    (plane.headingDeg + input.yawAxis * 10 * steerAuthority * dt + 360) % 360;
  // A little differential roll input helps the turn on the ground too.
  plane.headingDeg =
    (plane.headingDeg + input.rollAxis * 6 * steerAuthority * dt + 360) % 360;

  // --- move along the ground -------------------------------------------------
  const fwd = headingForwardDeg(plane.headingDeg);
  const speedMs = plane.speedKt * KT_TO_MS;
  plane.pos.x += fwd.x * speedMs * dt;
  plane.pos.z += fwd.z * speedMs * dt;
  const ground = groundHeight(plane.pos.x, plane.pos.z);
  plane.pos.y = ground + 0.8;
  plane.vsFpm = 0;

  // --- liftoff ---------------------------------------------------------------
  if (plane.speedKt >= FLIGHT.rotateKt && plane.pitchDeg >= 8) {
    plane.onGround = false;
    plane.airborne = true;
    plane.pitchDeg = 10;
    plane.vsFpm = plane.speedKt * 101.27 * Math.sin(10 * (Math.PI / 180));
    return { event: 'liftoff' };
  }

  // --- stopped ---------------------------------------------------------------
  if (plane.speedKt <= 0.5 && plane.airborneOnce) {
    return { event: 'stopped' };
  }
  return { event: null };
}
