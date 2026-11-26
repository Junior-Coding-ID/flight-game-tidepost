// worldRenderer — the software 3D renderer: sky, sea, terrain, runways,
// landmarks, gates and the Tidewing, all flat-shaded triangles painted
// back to front on a 2D canvas. No WebGL, no library, no textures: the
// low-poly golden-hour look comes from the sun direction and the palette.

import { COLORS, WORLD, RUNWAYS } from './config.js';
import { clamp, lerp, makeViewBasis, projectPoint, normalize, cross, sub, dot, rotateAircraft } from './math3d.js';
import { terrainHeight, sampleTerrainGrid } from './terrainGenerator.js';
import { runwayCorners, runwayDashes, LANDMARKS, CLOUDS } from './world.js';
import { buildTidewingMesh, buildPropellerMesh } from './aircraftModel.js';

const SUN = normalize(WORLD.sunDir);
const FOV_DEG = 68;

// --- colour helpers ----------------------------------------------------------
function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function css(rgb, alpha = 1) {
  return alpha >= 1
    ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
    : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

function shadeColor(hex, brightness) {
  const rgb = hexRgb(hex);
  return css([Math.round(rgb[0] * brightness), Math.round(rgb[1] * brightness), Math.round(rgb[2] * brightness)]);
}

const SEA_DEEP = hexRgb(COLORS.seaDeep);
const SEA_SHALLOW = hexRgb(COLORS.seaShallow);
const SAND = hexRgb(COLORS.sand);
const GRASS = hexRgb(COLORS.grass);
const ROCK = hexRgb(COLORS.rock);
const CLIFF = hexRgb(COLORS.cliff);
const HAZE = hexRgb(COLORS.skyHorizon);

// --- terrain grid cache --------------------------------------------------------
let gridCache = null;

function getTerrainGrid(focusX, focusZ) {
  if (
    gridCache &&
    Math.abs(gridCache.cx - focusX) < 300 &&
    Math.abs(gridCache.cz - focusZ) < 300
  ) {
    return gridCache.rows;
  }
  const rows = sampleTerrainGrid(focusX, focusZ, 150, 12);
  gridCache = { cx: focusX, cz: focusZ, rows };
  return rows;
}

function terrainColor(y, slope) {
  let base;
  if (y < 3.5) base = mixRgb(SAND, GRASS, clamp(y / 3.5, 0, 1));
  else if (y < 34) base = GRASS;
  else if (y < 80) base = mixRgb(GRASS, ROCK, clamp((y - 34) / 46, 0, 1));
  else base = mixRgb(ROCK, CLIFF, clamp((y - 80) / 60, 0, 1));
  const shade = 0.82 + 0.18 * clamp(1 - slope, 0, 1);
  return [Math.round(base[0] * shade), Math.round(base[1] * shade), Math.round(base[2] * shade)];
}

// --- landmark meshes (local space, base at y = 0) ------------------------------
function boxMesh(cx, cy, cz, hx, hy, hz, color) {
  const c = [
    [cx - hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy + hy, cz - hz], [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz],
    [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz],
  ];
  const faces = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]];
  const tris = [];
  for (const [a, b, d, e] of faces) {
    tris.push({ p: [c[a], c[b], c[d]], color }, { p: [c[a], c[d], c[e]], color });
  }
  return tris;
}

function landmarkMesh(kind) {
  if (kind === 'hangar') {
    return [
      ...boxMesh(0, 9, 0, 23, 9, 15, COLORS.hangar),
      ...boxMesh(0, 19, 0, 23, 2, 15, COLORS.planeDark),
      ...boxMesh(0, 5, -15.5, 12, 5, 0.8, COLORS.planeDark),
    ];
  }
  if (kind === 'lighthouse') {
    const tris = [];
    tris.push(...boxMesh(0, 8, 0, 4.5, 8, 4.5, COLORS.lighthouse));
    tris.push(...boxMesh(0, 20, 0, 3.2, 4, 3.2, COLORS.lighthouse));
    tris.push(...boxMesh(0, 27, 0, 3.8, 2.5, 3.8, COLORS.lighthouseTop));
    tris.push(...boxMesh(0, 31, 0, 1.6, 1.6, 1.6, '#ffe9a8'));
    return tris;
  }
  // Weather tower on the cliff: mast, cross-arms and a dish.
  const tris = [];
  tris.push(...boxMesh(0, 14, 0, 1.6, 14, 1.6, COLORS.tower));
  tris.push(...boxMesh(0, 26, 0, 7, 0.7, 0.7, COLORS.tower));
  tris.push(...boxMesh(0, 22, 0, 0.7, 0.7, 7, COLORS.tower));
  tris.push(...boxMesh(0, 30, 0, 2.2, 2.2, 2.2, COLORS.planeOrange));
  return tris;
}

const LANDMARK_MESHES = {};
for (const lm of LANDMARKS) {
  if (!LANDMARK_MESHES[lm.kind]) LANDMARK_MESHES[lm.kind] = landmarkMesh(lm.kind);
}

const TIDEWING = buildTidewingMesh();

// --- triangle drawing ---------------------------------------------------------
function faceBrightness(a, b, c) {
  const u = sub(b, a);
  const v = sub(c, a);
  const n = normalize(cross(u, v));
  return { normal: n, light: 0.62 + 0.38 * Math.max(0, dot(n, SUN)) };
}

function drawTriangleList(ctx, tris, eye, basis, focal, cx, cy, transform) {
  // transform: (p) => world-space point. Painter-sorted by centroid depth.
  // Mesh points may be arrays [x, y, z] or objects {x, y, z}: normalise
  // before transforming, or the rotation reads undefined coordinates.
  const items = [];
  for (const t of tris) {
    const w = t.p.map((pt) => {
      const p = Array.isArray(pt) ? { x: pt[0], y: pt[1], z: pt[2] } : pt;
      return transform(p);
    });
    const { normal, light } = faceBrightness(w[0], w[1], w[2]);
    const toCam = sub(eye, w[0]);
    if (dot(normal, toCam) <= 0) continue; // back face
    const s = w.map((p) => projectPoint(p, eye, basis, focal, cx, cy));
    if (s.some((q) => q === null)) continue;
    const depth = (s[0].depth + s[1].depth + s[2].depth) / 3;
    items.push({ s, depth, color: shadeColor(t.color, light) });
  }
  items.sort((a, b) => b.depth - a.depth);
  for (const it of items) {
    ctx.fillStyle = it.color;
    ctx.beginPath();
    ctx.moveTo(it.s[0].x, it.s[0].y);
    ctx.lineTo(it.s[1].x, it.s[1].y);
    ctx.lineTo(it.s[2].x, it.s[2].y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawQuad(ctx, pts, eye, basis, focal, cx, cy, fill) {
  const s = pts.map((p) => projectPoint(p, eye, basis, focal, cx, cy));
  if (s.some((q) => q === null)) return;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(s[0].x, s[0].y);
  ctx.lineTo(s[1].x, s[1].y);
  ctx.lineTo(s[2].x, s[2].y);
  ctx.lineTo(s[3].x, s[3].y);
  ctx.closePath();
  ctx.fill();
}

// --- the frame ------------------------------------------------------------------
export function renderWorld(ctx, scene) {
  const { width, height, eye, target, plane, gates, particles, timeSec } = scene;
  const cx = width / 2;
  const cy = height / 2;
  const focal = (height / 2) / Math.tan((FOV_DEG / 2) * (Math.PI / 180));
  const basis = makeViewBasis(eye, target, { x: 0, y: 1, z: 0 });

  // Sky: golden-hour gradient, warm at the horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.55, COLORS.skyMid);
  sky.addColorStop(0.78, COLORS.skyHorizon);
  sky.addColorStop(1, COLORS.skyHorizon);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Sun disc, placed where the sun actually is.
  const sunPoint = {
    x: eye.x + SUN.x * 6000,
    y: eye.y + SUN.y * 6000,
    z: eye.z + SUN.z * 6000,
  };
  const sunScreen = projectPoint(sunPoint, eye, basis, focal, cx, cy);
  if (sunScreen) {
    const glow = ctx.createRadialGradient(sunScreen.x, sunScreen.y, 4, sunScreen.x, sunScreen.y, 130);
    glow.addColorStop(0, 'rgba(255, 236, 180, 0.95)');
    glow.addColorStop(0.25, 'rgba(255, 214, 130, 0.55)');
    glow.addColorStop(1, 'rgba(255, 214, 130, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunScreen.x - 140, sunScreen.y - 140, 280, 280);
  }

  // Sea: a gradient band from the horizon line down.
  const horizonPoint = {
    x: eye.x + basis.forward.x * 6000,
    y: 0,
    z: eye.z + basis.forward.z * 6000,
  };
  const horizonScreen = projectPoint(horizonPoint, eye, basis, focal, cx, cy);
  const horizonY = horizonScreen ? horizonScreen.y : cy;
  if (horizonY < height) {
    const sea = ctx.createLinearGradient(0, Math.max(0, horizonY), 0, height);
    sea.addColorStop(0, COLORS.seaShallow);
    sea.addColorStop(1, COLORS.seaDeep);
    ctx.fillStyle = sea;
    ctx.fillRect(0, Math.max(0, horizonY), width, height - Math.max(0, horizonY));
  }

  // Clouds: soft screen-space puffs projected from their centres, so they
  // read as clouds from any angle instead of flat slabs seen edge-on.
  for (const cloud of CLOUDS) {
    const drift = ((timeSec * 2 + cloud.x) % 200) - 100;
    const c = { x: cloud.x + drift * 0.2, y: cloud.y, z: cloud.z };
    const s = projectPoint(c, eye, basis, focal, cx, cy);
    if (!s) continue;
    const rx = (cloud.w / 2) * (focal / s.depth);
    if (rx < 4 || rx > width) continue;
    const ry = rx * 0.32;
    ctx.fillStyle = 'rgba(253, 246, 232, 0.85)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s.x - rx * 0.45, s.y + ry * 0.25, rx * 0.55, ry * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s.x + rx * 0.5, s.y + ry * 0.3, rx * 0.5, ry * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Terrain: quads around the focus point, painter-sorted, hazed by distance.
  const focusX = clamp(target.x, -WORLD.halfM, WORLD.halfM);
  const focusZ = clamp(target.z, -WORLD.halfM, WORLD.halfM);
  const rows = getTerrainGrid(focusX, focusZ);
  const quads = [];
  for (let j = 0; j < rows.length - 1; j += 1) {
    for (let i = 0; i < rows[j].length - 1; i += 1) {
      const a = rows[j][i];
      const b = rows[j][i + 1];
      const d = rows[j + 1][i + 1];
      const e = rows[j + 1][i];
      const maxY = Math.max(a.y, b.y, d.y, e.y);
      if (maxY <= 0.6) continue;
      const avgY = (a.y + b.y + d.y + e.y) / 4;
      const slope = Math.abs(b.y - a.y) + Math.abs(e.y - a.y);
      const depth = Math.hypot((a.x + d.x) / 2 - eye.x, (a.z + d.z) / 2 - eye.z);
      // The grid ends mid-island: fade its outer ring into the sea so the
      // cut edge never reads as a paper cliff.
      const atEdge = i === 0 || j === 0 || i === rows[j].length - 2 || j === rows.length - 2;
      quads.push({ pts: [a, b, d, e], color: terrainColor(avgY, slope), depth, atEdge });
    }
  }
  quads.sort((p, q) => q.depth - p.depth);
  for (const q of quads) {
    const haze = clamp((q.depth - 900) / 2600, 0, 0.55);
    let mixed = mixRgb(q.color, HAZE, haze);
    if (q.atEdge) mixed = mixRgb(mixed, SEA_SHALLOW, 0.7);
    drawQuad(ctx, q.pts, eye, basis, focal, cx, cy, css(mixed));
  }

  // Runways: dark strips, centreline dashes, threshold bars. Dashes right
  // under the camera project into giant slabs, so skip the ones closer
  // than 45 m — the pilot cannot see them anyway.
  for (const runway of Object.values(RUNWAYS)) {
    const corners = runwayCorners(runway);
    drawQuad(ctx, corners, eye, basis, focal, cx, cy, COLORS.runway);
    for (const dash of runwayDashes(runway)) {
      const mid = {
        x: (dash[0].x + dash[2].x) / 2,
        y: (dash[0].y + dash[2].y) / 2,
        z: (dash[0].z + dash[2].z) / 2,
      };
      const dist = Math.hypot(mid.x - eye.x, mid.y - eye.y, mid.z - eye.z);
      if (dist < 45) continue;
      drawQuad(ctx, dash, eye, basis, focal, cx, cy, COLORS.runwayLine);
    }
  }

  // Landmarks.
  for (const lm of LANDMARKS) {
    const mesh = LANDMARK_MESHES[lm.kind];
    drawTriangleList(ctx, mesh, eye, basis, focal, cx, cy, (p) => {
      const rotated = rotateAircraft(p, lm.headingDeg, 0, 0);
      return { x: rotated.x + lm.pos.x, y: rotated.y + lm.pos.y, z: rotated.z + lm.pos.z };
    });
  }

  // Gates: glowing rings the pilot flies through.
  for (const gate of gates) {
    const g = projectPoint(gate.pos, eye, basis, focal, cx, cy);
    if (!g) continue;
    const rPx = (gate.radiusM * focal) / g.depth;
    if (rPx < 2 || rPx > width * 2) continue;
    ctx.strokeStyle = gate.passed ? 'rgba(120, 220, 140, 0.95)' : 'rgba(255, 214, 110, 0.95)';
    ctx.lineWidth = Math.max(2, rPx * 0.06);
    ctx.beginPath();
    ctx.arc(g.x, g.y, rPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = gate.passed ? 'rgba(120, 220, 140, 0.12)' : 'rgba(255, 214, 110, 0.10)';
    ctx.fill();
  }

  // The Tidewing itself, propeller spinning.
  if (scene.showPlane !== false) {
    const prop = buildPropellerMesh(plane.propSpinRad);
    const all = [...TIDEWING, ...prop];
    drawTriangleList(ctx, all, eye, basis, focal, cx, cy, (p) => {
      const rotated = rotateAircraft(p, plane.headingDeg, plane.pitchDeg, plane.bankDeg);
      return { x: rotated.x + plane.pos.x, y: rotated.y + plane.pos.y, z: rotated.z + plane.pos.z };
    });
  }

  // Particles: touchdown smoke, dust on the runway.
  for (const p of particles) {
    const s = projectPoint(p.pos, eye, basis, focal, cx, cy);
    if (!s) continue;
    const rPx = Math.max(1, (p.sizeM * focal) / s.depth);
    ctx.fillStyle = css(hexRgb(p.color), p.alpha);
    ctx.beginPath();
    ctx.arc(s.x, s.y, rPx, 0, Math.PI * 2);
    ctx.fill();
  }
}
