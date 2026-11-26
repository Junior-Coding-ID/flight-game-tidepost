// navigationSystem — where to go next, and how far off the line you are.
// Bearing and distance to the destination, the next gate, and the two
// glide-slope needles (alignment and height) the pilot flies on final.
// Pure geometry: it reads the aircraft and the mission, it changes nothing.

import { GATES, RUNWAYS } from './config.js';
import { angleDiffDeg, clamp, distance2D, headingForwardDeg } from './math3d.js';
import { runwayThreshold, computeMissionGates } from './world.js';

export function bearingToDeg(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  // Heading 0 = north (-Z): bearing = atan2(dx, -dz).
  return (Math.atan2(dx, -dz) * (180 / Math.PI) + 360) % 360;
}

export function createNavigation(missionId) {
  return {
    gates: computeMissionGates(missionId),
    nextGateIndex: 0,
  };
}

// The next thing the pilot must fly through, or the runway itself.
export function currentTarget(nav, mission) {
  if (nav.nextGateIndex < nav.gates.length) return nav.gates[nav.nextGateIndex];
  const runway = RUNWAYS[mission.to];
  return { id: 'runway', label: runway.name, pos: runwayThreshold(runway), radiusM: runway.widthM };
}

export function checkGatePass(nav, plane) {
  if (nav.nextGateIndex >= nav.gates.length) return null;
  const gate = nav.gates[nav.nextGateIndex];
  const dx = plane.pos.x - gate.pos.x;
  const dy = plane.pos.y - gate.pos.y;
  const dz = plane.pos.z - gate.pos.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist <= gate.radiusM) {
    gate.passed = true;
    nav.nextGateIndex += 1;
    return gate;
  }
  return null;
}

// Glide guidance on final: two needles, -1..1, for the alignment indicator.
// lateral: how far left/right of the extended centreline (in runway widths).
// vertical: how far above/below the 0.065 glide slope (in slope heights).
export function glideGuidance(plane, runway) {
  const threshold = runwayThreshold(runway);
  const fwd = headingForwardDeg(runway.headingDeg);
  const right = { x: -fwd.z, z: fwd.x };
  const dx = plane.pos.x - threshold.x;
  const dz = plane.pos.z - threshold.z;
  const along = dx * fwd.x + dz * fwd.z; // > 0 beyond the threshold (on final)
  const across = dx * right.x + dz * right.z;
  const heightAboveThreshold = plane.pos.y - threshold.y;
  const idealHeight = Math.max(0, along) * GATES.glideSlope;
  const lateral = clamp(across / (runway.widthM * 2.5), -1, 1);
  const vertical = clamp((heightAboveThreshold - idealHeight) / 30, -1, 1);
  return {
    lateral,
    vertical,
    distanceToThresholdM: Math.max(0, along),
    onFinal: along > 0 && along < 2500 && Math.abs(across) < 400,
  };
}

export function navigationReadout(plane, nav, mission) {
  const runway = RUNWAYS[mission.to];
  const target = currentTarget(nav, mission);
  const bearing = bearingToDeg(plane.pos, target.pos);
  const distanceM = distance2D(plane.pos, target.pos);
  const headingError = angleDiffDeg(bearing, plane.headingDeg);
  const glide = glideGuidance(plane, runway);
  return {
    targetLabel: target.label,
    bearingDeg: Math.round(bearing),
    distanceM: Math.round(distanceM),
    headingErrorDeg: Math.round(headingError),
    glide,
    gatesPassed: nav.gates.filter((g) => g.passed).length,
    gatesTotal: nav.gates.length,
  };
}
