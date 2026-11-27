// gateGeometry — the rally gates as shapes, and the hit test for each.
// An Open gate is a circle (44 m across) in the plane facing the flight
// direction; a Technical gate is a vertical octagon (26 m wide, 32 m tall)
// whose hitbox follows its actual size. Precision is 1 dead centre and 0
// at the rim, so the same number drives both the hit and the score.

import { clamp } from './math3d.js';

// A gate's local frame: forward (the leg direction), right, up.
export function gateLocalOffset(gate, pos) {
  const dx = pos.x - gate.pos.x;
  const dy = pos.y - gate.pos.y;
  const dz = pos.z - gate.pos.z;
  const f = gate.forward;
  const along = dx * f.x + dz * f.z;
  const right = dx * f.rightX + dz * f.rightZ;
  return { along, right, up: dy };
}

// Normalised in-plane offset: 0 at the centre, 1 at the rim. Circle gates
// use the radius; octagon gates use the elliptical (halfW, halfH) frame,
// which follows the actual 26x32 shape instead of a bounding circle.
export function gateShapeOffset(gate, pos) {
  const o = gateLocalOffset(gate, pos);
  if (gate.shape === 'octagon') {
    return Math.sqrt((o.right / gate.halfW) ** 2 + (o.up / gate.halfH) ** 2);
  }
  return Math.sqrt(o.right * o.right + o.up * o.up) / gate.radiusM;
}

// A gate is hittable only near its own plane: the ring is thin, so a pass
// 30 m in front of it or behind it is not a pass through it.
export function gateHit(gate, pos) {
  const o = gateLocalOffset(gate, pos);
  if (Math.abs(o.along) > 20) return false;
  return gateShapeOffset(gate, pos) <= 1;
}

// Precision of a pass: 1 dead centre, 0 at the rim, 0 outside. The score
// formulas take this number as `a`.
export function gatePrecision(gate, pos) {
  const shape = gateShapeOffset(gate, pos);
  return clamp(1 - shape, 0, 1);
}

// The eight corners of a vertical octagon gate, in world space, for the
// renderer: flat top and bottom, cut corners, 26 m wide and 32 m tall.
export function octagonCorners(gate) {
  const hw = gate.halfW;
  const hh = gate.halfH;
  const cutW = hw * 0.42;
  const cutH = hh * 0.42;
  const corners = [
    [-hw + cutW, hh],
    [hw - cutW, hh],
    [hw, hh - cutH],
    [hw, -hh + cutH],
    [hw - cutW, -hh],
    [-hw + cutW, -hh],
    [-hw, -hh + cutH],
    [-hw, hh - cutH],
  ];
  return corners.map(([r, u]) => ({
    x: gate.pos.x + gate.forward.rightX * r,
    y: gate.pos.y + u,
    z: gate.pos.z + gate.forward.rightZ * r,
  }));
}
