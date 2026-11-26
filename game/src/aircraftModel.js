// aircraftModel — the Tidewing T-01 bush plane as flat-shaded triangles.
// Model space: nose toward -Z, right wing toward +X, up toward +Y, metres.
// Cream fuselage, orange wings and tail, dark glass — the same palette the
// brief paints the whole game in. No textures, no imported geometry.

import { COLORS } from './config.js';

// A box from a centre, half-extents and a colour. Faces are wound so their
// normals point outward; the renderer shades by the face normal.
function boxTriangles(cx, cy, cz, hx, hy, hz, color) {
  const c = [
    [cx - hx, cy - hy, cz - hz],
    [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy + hy, cz - hz],
    [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz],
    [cx + hx, cy - hy, cz + hz],
    [cx + hx, cy + hy, cz + hz],
    [cx - hx, cy + hy, cz + hz],
  ];
  const faces = [
    [0, 1, 2, 3], // back (-Z)
    [5, 4, 7, 6], // front (+Z)
    [4, 0, 3, 7], // left (-X)
    [1, 5, 6, 2], // right (+X)
    [3, 2, 6, 7], // top (+Y)
    [4, 5, 1, 0], // bottom (-Y)
  ];
  const tris = [];
  for (const [a, b, d, e] of faces) {
    tris.push(
      { p: [c[a], c[b], c[d]], color },
      { p: [c[a], c[d], c[e]], color },
    );
  }
  return tris;
}

function tri(a, b, c, color) {
  return { p: [a, b, c], color };
}

// A tapered fuselage: three box sections shrinking toward the tail, so the
// silhouette reads as a built aircraft instead of a crate.
function fuselageTriangles() {
  const tris = [];
  const cream = COLORS.planeCream;
  const orange = COLORS.planeOrange;
  // Nose to cabin.
  tris.push(...boxTriangles(0, 0.15, -3.1, 0.62, 0.62, 1.4, cream));
  // Cabin (with the dark glasshouse on top).
  tris.push(...boxTriangles(0, 0.1, -0.9, 0.58, 0.58, 1.5, cream));
  tris.push(...boxTriangles(0, 0.62, -1.1, 0.5, 0.22, 1.1, COLORS.planeDark));
  // Tail cone, tapering.
  tris.push(...boxTriangles(0, 0.28, 1.7, 0.4, 0.42, 1.4, cream));
  tris.push(...boxTriangles(0, 0.42, 3.4, 0.2, 0.24, 0.9, orange));
  // Belly stripe, orange, so the plane reads from below too.
  tris.push(...boxTriangles(0, -0.42, -1.6, 0.5, 0.12, 2.6, orange));
  return tris;
}

function wingTriangles() {
  const tris = [];
  const orange = COLORS.planeOrange;
  const cream = COLORS.planeCream;
  // High wing: one long thin slab, orange on top, cream underneath.
  tris.push(...boxTriangles(0, 0.78, -1.15, 5.4, 0.09, 0.85, orange));
  tris.push(...boxTriangles(0, 0.72, -1.15, 5.4, 0.04, 0.85, cream));
  // Wingtip stripes.
  tris.push(...boxTriangles(-5.05, 0.78, -1.15, 0.35, 0.1, 0.85, cream));
  tris.push(...boxTriangles(5.05, 0.78, -1.15, 0.35, 0.1, 0.85, cream));
  // Wing struts down to the fuselage.
  tris.push(...boxTriangles(-1.5, 0.35, -1.15, 0.06, 0.45, 0.06, COLORS.planeDark));
  tris.push(...boxTriangles(1.5, 0.35, -1.15, 0.06, 0.45, 0.06, COLORS.planeDark));
  // Horizontal stabiliser at the tail.
  tris.push(...boxTriangles(0, 0.5, 3.9, 1.9, 0.07, 0.55, orange));
  // Vertical fin.
  tris.push(
    tri([0, 0.45, 3.2], [0, 0.45, 4.5], [0, 1.75, 4.35], orange),
    tri([0, 0.45, 3.2], [0, 1.75, 4.35], [0, 1.75, 3.55], orange),
    tri([0.06, 0.45, 3.2], [0.06, 1.75, 4.35], [0.06, 0.45, 4.5], orange),
    tri([0.06, 0.45, 3.2], [0.06, 1.75, 3.55], [0.06, 1.75, 4.35], orange),
  );
  return tris;
}

function gearTriangles() {
  const tris = [];
  const dark = COLORS.planeDark;
  // Two main wheels with struts, one tail wheel: fixed bush gear.
  for (const side of [-1, 1]) {
    tris.push(...boxTriangles(side * 0.75, -0.35, -1.6, 0.07, 0.4, 0.07, dark));
    tris.push(...boxTriangles(side * 0.8, -0.78, -1.6, 0.12, 0.22, 0.3, dark));
  }
  tris.push(...boxTriangles(0, -0.15, 3.9, 0.05, 0.3, 0.05, dark));
  tris.push(...boxTriangles(0, -0.45, 3.95, 0.09, 0.14, 0.2, dark));
  return tris;
}

export function buildTidewingMesh() {
  return [
    ...fuselageTriangles(),
    ...wingTriangles(),
    ...gearTriangles(),
  ];
}

// The propeller spins about the forward axis (model -Z) at the nose.
// Two blades + hub, rebuilt each frame from the spin angle.
export function buildPropellerMesh(spinRad) {
  const cos = Math.cos(spinRad);
  const sin = Math.sin(spinRad);
  const blade = (sign) => {
    const tip = { x: 0, y: sign * 1.35, z: -4.55 };
    const root = { x: 0, y: sign * 0.18, z: -4.55 };
    const w = 0.09;
    const rot = (p) => ({
      x: p.x * cos - p.y * sin,
      y: p.x * sin + p.y * cos,
      z: p.z,
    });
    const a = rot({ x: root.x - w, y: root.y, z: root.z });
    const b = rot({ x: root.x + w, y: root.y, z: root.z });
    const c = rot({ x: tip.x + w * 0.5, y: tip.y, z: tip.z });
    const d = rot({ x: tip.x - w * 0.5, y: tip.y, z: tip.z });
    return [tri([a.x, a.y, a.z], [b.x, b.y, b.z], [c.x, c.y, c.z], COLORS.planeDark),
      tri([a.x, a.y, a.z], [c.x, c.y, c.z], [d.x, d.y, d.z], COLORS.planeDark)];
  };
  return [
    ...blade(1),
    ...blade(-1),
    ...boxTriangles(0, 0, -4.55, 0.16, 0.16, 0.12, COLORS.planeOrange),
  ];
}
