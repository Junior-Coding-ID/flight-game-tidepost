// routeGraph — the SKYWEAVE+ rally route as a graph, not a list.
// One track, 12 defined checkpoints: 6 shared Open gates and 6 branch
// gates (3 exclusive forks x Open/Technical). A run flies 9 of them: the
// 6 shared gates plus one branch gate per fork, so 8 route codes exist
// (OOO-TTT). The third fork (displayed 03/03) is the Landmark Survey:
// both its branch gates score the Pelican Bay lighthouse framing.
//
// Geometry: the spine runs from Mailhaven to the Pelican Bay threshold.
// Branch gates sit 280 m either side of the spine at the same station;
// Open on the lighthouse (south) side, Technical on the north side.
// Altitudes ride a smooth hump over the bay and drop onto the glide
// slope for the final approach gate, which uses the same 380 m / 0.065
// slope rule as the v1 approach gate.

import { RUNWAYS, GATES, RALLY } from './config.js';
import { headingForwardDeg } from './math3d.js';
import { runwayThreshold } from './world.js';

function spineAltitude(t) {
  // 40 m off the deck, up to ~240 m over the bay, back down toward final.
  return 40 + 200 * Math.sin(Math.PI * Math.min(Math.max(t, 0), 1));
}

export function buildRouteGraph() {
  const from = RUNWAYS.mailhaven;
  const to = RUNWAYS.pelican;
  const threshold = runwayThreshold(to);
  const f = headingForwardDeg(to.headingDeg);
  // Approach gate: 380 m before the threshold on the 0.065 glide slope.
  const approach = {
    x: threshold.x - f.x * GATES.approachDistanceM,
    y: threshold.y + GATES.approachDistanceM * GATES.glideSlope,
    z: threshold.z - f.z * GATES.approachDistanceM,
  };
  // Spine from the departure strip to the approach gate.
  const start = { x: from.center.x, y: from.elevationM + 30, z: from.center.z };
  const legDx = approach.x - start.x;
  const legDz = approach.z - start.z;
  const legLen = Math.hypot(legDx, legDz);
  const fwdX = legDx / legLen;
  const fwdZ = legDz / legLen;
  // Right of the leg direction (heading 0 = north = -Z, so right = (-fz, fx)).
  const rightX = -fwdZ;
  const rightZ = fwdX;
  const forward = { x: fwdX, z: fwdZ, rightX, rightZ };
  const legHeadingDeg = (Math.atan2(fwdX, -fwdZ) * (180 / Math.PI) + 360) % 360;

  const at = (t) => ({
    x: start.x + legDx * t,
    y: spineAltitude(t),
    z: start.z + legDz * t,
  });

  const openGate = (id, label, pos, extra = {}) => ({
    id,
    label,
    kind: 'open',
    shape: 'circle',
    radiusM: RALLY.openRadiusM,
    halfW: RALLY.openRadiusM,
    halfH: RALLY.openRadiusM,
    color: RALLY.openColor,
    pos,
    forward,
    headingDeg: legHeadingDeg,
    fork: null,
    branch: null,
    survey: false,
    passed: false,
    missed: false,
    active: true,
    accuracy: null,
    pointsEarned: 0,
    comboEarned: 0,
    ...extra,
  });
  const techGate = (id, label, pos, extra = {}) => ({
    id,
    label,
    kind: 'technical',
    shape: 'octagon',
    radiusM: 0,
    halfW: RALLY.techHalfWM,
    halfH: RALLY.techHalfHM,
    color: RALLY.techColor,
    pos,
    forward,
    headingDeg: legHeadingDeg,
    fork: null,
    branch: null,
    survey: false,
    passed: false,
    missed: false,
    active: true,
    accuracy: null,
    pointsEarned: 0,
    comboEarned: 0,
    ...extra,
  });
  const branchPos = (t, side) => {
    const p = at(t);
    return {
      x: p.x + rightX * RALLY.branchOffsetM * side,
      y: p.y + (side < 0 ? 40 : 0),
      z: p.z + rightZ * RALLY.branchOffsetM * side,
    };
  };

  // Stations along the spine. Shared gates ride the spine; fork gates sit
  // on the two branch lanes at the same station.
  const gates = [
    openGate('S1', 'Shared gate 1', at(0.1)),
    openGate('S2', 'Shared gate 2', at(0.26)),
    openGate('O01', 'Fork 01 — Open', branchPos(0.4, 1), { fork: 0, branch: 'O' }),
    techGate('T01', 'Fork 01 — Technical', branchPos(0.4, -1), { fork: 0, branch: 'T' }),
    openGate('S3', 'Shared gate 3', at(0.5)),
    openGate('O02', 'Fork 02 — Open', branchPos(0.6, 1), { fork: 1, branch: 'O' }),
    techGate('T02', 'Fork 02 — Technical', branchPos(0.6, -1), { fork: 1, branch: 'T' }),
    openGate('S4', 'Shared gate 4', at(0.7)),
    openGate('O03', 'Fork 03 — Open · Survey', branchPos(0.8, 1), { fork: 2, branch: 'O', survey: true }),
    techGate('T03', 'Fork 03 — Technical · Survey', branchPos(0.8, -1), { fork: 2, branch: 'T', survey: true }),
    openGate('S5', 'Shared gate 5', at(0.88)),
    openGate('S6', 'Precision finish', approach),
  ];

  const forks = [0, 1, 2].map((i) => ({
    index: i,
    display: `FORK 0${i + 1}/03`,
    openId: `O0${i + 1}`,
    techId: `T0${i + 1}`,
    survey: i === RALLY.surveyForkIndex,
    midpoint: at([0.4, 0.6, 0.8][i]),
  }));

  return {
    gates,
    forks,
    forward,
    legHeadingDeg,
    approach,
    sharedCount: 6,
    branchCount: 6,
    flownCount: 9,
    surveyForkIndex: RALLY.surveyForkIndex,
  };
}

// The 8 route codes, OOO-TTT, from the three committed branches.
export function routeCodeFor(committed) {
  return committed.map((c) => (c === 'T' ? 'T' : 'O')).join('');
}

export const ROUTE_CODES = ['OOO', 'OOT', 'OTO', 'OTT', 'TOO', 'TOT', 'TTO', 'TTT'];
