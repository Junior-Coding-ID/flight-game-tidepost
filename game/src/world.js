// world — the archipelago as gameplay objects: runways with thresholds and
// corners, landmarks, clouds, and the per-mission route/approach gates.
// Pure data + small geometry helpers; nothing here draws or simulates.

import { RUNWAYS, GATES, missionById } from './config.js';
import { headingForwardDeg, headingRightDeg } from './math3d.js';

export function runwayThreshold(runway) {
  // The approach-end threshold: the point a landing aircraft aims for.
  const f = headingForwardDeg(runway.headingDeg);
  const half = runway.lengthM / 2;
  return {
    x: runway.center.x - f.x * half,
    y: runway.elevationM,
    z: runway.center.z - f.z * half,
  };
}

export function runwayEnd(runway) {
  const f = headingForwardDeg(runway.headingDeg);
  const half = runway.lengthM / 2;
  return {
    x: runway.center.x + f.x * half,
    y: runway.elevationM,
    z: runway.center.z + f.z * half,
  };
}

export function runwayCorners(runway) {
  const f = headingForwardDeg(runway.headingDeg);
  const r = headingRightDeg(runway.headingDeg);
  const hl = runway.lengthM / 2;
  const hw = runway.widthM / 2;
  const y = runway.elevationM + 0.15;
  const corner = (along, across) => ({
    x: runway.center.x + f.x * along + r.x * across,
    y,
    z: runway.center.z + f.z * along + r.z * across,
  });
  return [
    corner(-hl, -hw),
    corner(hl, -hw),
    corner(hl, hw),
    corner(-hl, hw),
  ];
}

// Centreline dashes, laid out as small quads the renderer draws flat.
export function runwayDashes(runway) {
  const f = headingForwardDeg(runway.headingDeg);
  const r = headingRightDeg(runway.headingDeg);
  const dashes = [];
  const step = 40;
  const y = runway.elevationM + 0.3;
  for (let d = -runway.lengthM / 2 + 30; d < runway.lengthM / 2 - 10; d += step) {
    const cx = runway.center.x + f.x * d;
    const cz = runway.center.z + f.z * d;
    dashes.push([
      { x: cx - f.x * 9 - r.x * 1.5, y, z: cz - f.z * 9 - r.z * 1.5 },
      { x: cx + f.x * 9 - r.x * 1.5, y, z: cz + f.z * 9 - r.z * 1.5 },
      { x: cx + f.x * 9 + r.x * 1.5, y, z: cz + f.z * 9 + r.z * 1.5 },
      { x: cx - f.x * 9 + r.x * 1.5, y, z: cz - f.z * 9 + r.z * 1.5 },
    ]);
  }
  return dashes;
}

// Landmarks: a hangar at Mailhaven, a lighthouse at Pelican Bay, a cliff
// and a weather tower at Cloudreach. Each is a small triangle mesh with a
// position, so the renderer can draw it as one more solid.
export const LANDMARKS = [
  {
    id: 'hangar-mailhaven',
    kind: 'hangar',
    pos: { x: -2400, y: 6, z: -1650 },
    headingDeg: 300,
    sizeM: 46,
  },
  {
    id: 'lighthouse-pelican',
    kind: 'lighthouse',
    pos: { x: 2450, y: 10, z: -1150 },
    headingDeg: 0,
    sizeM: 26,
  },
  {
    id: 'tower-cloudreach',
    kind: 'tower',
    pos: { x: 180, y: 130, z: 2560 },
    headingDeg: 0,
    sizeM: 40,
  },
];

// A few slow-drifting clouds, flat-shaded white slabs at cruise altitude.
export const CLOUDS = [
  { x: -1200, y: 420, z: -2600, w: 420, d: 180 },
  { x: 800, y: 460, z: -2400, w: 520, d: 200 },
  { x: 2600, y: 400, z: 400, w: 460, d: 190 },
  { x: -2600, y: 440, z: 900, w: 500, d: 210 },
  { x: -400, y: 480, z: 1400, w: 560, d: 220 },
  { x: 1400, y: 430, z: 2900, w: 480, d: 190 },
];

// --- mission gates ----------------------------------------------------------
// Two gates per mission: a wide route gate halfway along the leg (50 pts)
// and a tight approach gate 380 m before the destination threshold on the
// 0.065 glide slope (50 pts).
export function computeMissionGates(missionId) {
  const mission = missionById(missionId);
  const to = RUNWAYS[mission.to];
  const threshold = runwayThreshold(to);
  const f = headingForwardDeg(to.headingDeg);
  // The route gate sits ON the extended centreline, 2500 m before the
  // threshold and on the 0.065 glide slope: it is the funnel onto final,
  // and the leg from it to the approach gate IS the glide slope, so the
  // descent is gentle and the 22 m approach gate is hittable. A midpoint
  // gate would leave the pilot joining final from 2 km off the centreline
  // with 380 m to fix it — unlandable, for a human or an agent.
  // The gate never sits below the departure runway + 30 m: on the
  // Cloudreach→Mailhaven leg the departure strip is high, and descending
  // into the home island right after takeoff is a crash.
  const from = RUNWAYS[mission.from];
  const routeGateAlt = Math.max(
    threshold.y + 2500 * GATES.glideSlope,
    from.elevationM + 30,
  );
  const routeGate = {
    id: 'route',
    label: 'Route gate',
    pos: {
      x: threshold.x - f.x * 2500,
      y: routeGateAlt,
      z: threshold.z - f.z * 2500,
    },
    radiusM: GATES.routeRadiusM,
    points: 50,
  };
  const approachGate = {
    id: 'approach',
    label: 'Approach gate',
    pos: {
      x: threshold.x - f.x * GATES.approachDistanceM,
      y: threshold.y + GATES.approachDistanceM * GATES.glideSlope,
      z: threshold.z - f.z * GATES.approachDistanceM,
    },
    radiusM: GATES.approachRadiusM,
    points: 50,
  };
  return [routeGate, approachGate];
}

export function listRunways() {
  return Object.values(RUNWAYS);
}
