// math3d — tiny vector / matrix helpers for the software 3D renderer.
// No library: everything the camera and the projector need, nothing more.
// Angles are degrees in game state, radians inside the math.

export const DEG = Math.PI / 180;

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function damp(current, target, rate, dt) {
  // Frame-rate independent exponential approach (rate ~ 1/s).
  return lerp(target, current, Math.exp(-rate * dt));
}

export function angleDiffDeg(a, b) {
  // Smallest signed difference a - b, in (-180, 180].
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

export function headingForwardDeg(headingDeg) {
  // Heading 0 = north = -Z, 90 = east = +X.
  const h = headingDeg * DEG;
  return { x: Math.sin(h), y: 0, z: -Math.cos(h) };
}

export function headingRightDeg(headingDeg) {
  const h = headingDeg * DEG;
  return { x: Math.cos(h), y: 0, z: Math.sin(h) };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(v, s) {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalize(v) {
  const l = length(v) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

export function distance2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// Rotate a point by heading (yaw), then pitch, then bank — the aircraft's
// own rotation order: yaw about Y, pitch about the rolled X, roll about Z.
export function rotateAircraft(p, headingDeg, pitchDeg, bankDeg) {
  const h = headingDeg * DEG;
  const pA = pitchDeg * DEG;
  const b = bankDeg * DEG;
  const ch = Math.cos(h);
  const sh = Math.sin(h);
  const cp = Math.cos(pA);
  const sp = Math.sin(pA);
  const cb = Math.cos(b);
  const sb = Math.sin(b);
  // Roll (about forward Z of the model) then pitch (about X) then yaw (about Y).
  // Sign convention: bank > 0 rolls right (right wing down), pitch > 0 is
  // nose up, heading 0 faces north (-Z) and grows clockwise (east = 90).
  // Model space: nose toward -Z, right wing toward +X, up toward +Y.
  const x1 = p.x * cb + p.y * sb;
  const y1 = -p.x * sb + p.y * cb;
  const z1 = p.z;
  const x2 = x1;
  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;
  return {
    x: x2 * ch - z2 * sh,
    y: y2,
    z: x2 * sh + z2 * ch,
  };
}

// Build a view basis from a camera position and a look-at point.
export function makeViewBasis(eye, target, upHint) {
  const forward = normalize(sub(target, eye));
  const right = normalize(cross(forward, upHint || { x: 0, y: 1, z: 0 }));
  const up = cross(right, forward);
  return { forward, right, up };
}

// Project a world point into screen space. Returns null behind the camera.
export function projectPoint(p, eye, basis, focalPx, cx, cy) {
  const d = sub(p, eye);
  const cz = dot(d, basis.forward);
  if (cz < 0.5) return null;
  const cxp = dot(d, basis.right);
  const cyp = dot(d, basis.up);
  return {
    x: cx + (cxp / cz) * focalPx,
    y: cy - (cyp / cz) * focalPx,
    depth: cz,
  };
}

// Deterministic seeded random (mulberry32) so the terrain is identical on
// every run and every machine.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
