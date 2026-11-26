// terrainGenerator — the 8x8 km archipelago as a pure height function.
// Three gaussian island bumps, deterministic value-noise detail, and a flat
// pad carved around every runway so the strip sits on level ground.
// The renderer samples this; the physics asks it for the ground height
// under the aircraft. One function, one truth.

import { ISLANDS, RUNWAYS, WORLD } from './config.js';
import { mulberry32 } from './math3d.js';

const NOISE_SEED = 20261126;

// --- deterministic value noise -------------------------------------------
const GRID = 256;
const noiseGrid = new Float32Array(GRID * GRID);
{
  const rand = mulberry32(NOISE_SEED);
  for (let i = 0; i < noiseGrid.length; i += 1) noiseGrid[i] = rand();
}

function noiseAt(ix, iz) {
  const x = ((ix % GRID) + GRID) % GRID;
  const z = ((iz % GRID) + GRID) % GRID;
  return noiseGrid[z * GRID + x];
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

export function valueNoise2D(x, z, cellM) {
  const gx = x / cellM;
  const gz = z / cellM;
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const fx = smooth(gx - x0);
  const fz = smooth(gz - z0);
  const a = noiseAt(x0, z0);
  const b = noiseAt(x0 + 1, z0);
  const c = noiseAt(x0, z0 + 1);
  const d = noiseAt(x0 + 1, z0 + 1);
  return (a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz) * 2 - 1;
}

// --- island masks ----------------------------------------------------------
function islandBump(x, z, island) {
  const dx = (x - island.center.x) / island.radiusM;
  const dz = (z - island.center.z) / island.radiusM;
  const d2 = dx * dx + dz * dz;
  if (d2 >= 1) return 0;
  // Smooth dome: 1 at the centre, 0 at the shore, with a soft beach skirt.
  const dome = Math.pow(Math.cos((Math.sqrt(d2) * Math.PI) / 2), 1.4);
  return dome;
}

function runwayFlatten(x, z) {
  // Returns { weight, height } of the strongest runway pad under (x, z).
  // Two shapes per runway: a wide, gentle apron around the strip, and a
  // flat approach corridor 1250 m long before the threshold, so the ground
  // under the final approach sits at runway elevation and the 0.065 glide
  // slope always has clearance over it. Without the corridor the island
  // rises toward the strip at nearly the slope's own gradient, and any
  // wobble on final flies the aircraft into the hillside.
  let bestWeight = 0;
  let bestHeight = 0;
  for (const r of Object.values(RUNWAYS)) {
    const h = r.headingDeg * (Math.PI / 180);
    const fx = Math.sin(h);
    const fz = -Math.cos(h);
    const rx = -fz;
    const rz = fx;
    const dx = x - r.center.x;
    const dz = z - r.center.z;
    const along = dx * fx + dz * fz;
    const across = dx * rx + dz * rz;
    const halfLen = r.lengthM / 2 + 450;
    const halfWid = r.widthM / 2 + 400;
    if (Math.abs(along) <= halfLen && Math.abs(across) <= halfWid) {
      const edge = Math.max(Math.abs(along) / halfLen, Math.abs(across) / halfWid);
      const t = Math.max(0, Math.min(1, (edge - 0.3) / 0.7));
      const weight = 1 - t * t * (3 - 2 * t);
      if (weight > bestWeight) {
        bestWeight = weight;
        bestHeight = r.elevationM;
      }
    }
    // Approach corridor: flat from 1250 m before the threshold to the strip.
    const thrX = r.center.x - fx * (r.lengthM / 2);
    const thrZ = r.center.z - fz * (r.lengthM / 2);
    const dtx = x - thrX;
    const dtz = z - thrZ;
    const alongT = dtx * fx + dtz * fz;
    const acrossT = dtx * rx + dtz * rz;
    if (alongT > -1250 && alongT < 60 && Math.abs(acrossT) < 220) {
      const alongW = alongT < -950 ? (alongT + 1250) / 300 : 1;
      const acrossW = Math.abs(acrossT) < 140 ? 1 : 1 - (Math.abs(acrossT) - 140) / 80;
      const s = (v) => v * v * (3 - 2 * v);
      const weight = s(Math.max(0, Math.min(1, alongW))) * s(Math.max(0, Math.min(1, acrossW)));
      if (weight > bestWeight) {
        bestWeight = weight;
        bestHeight = r.elevationM;
      }
    }
  }
  return { weight: bestWeight, height: bestHeight };
}

// --- the height function ----------------------------------------------------
export function terrainHeight(x, z) {
  // Outside the charted square the sea just goes on.
  if (x < -WORLD.halfM || x > WORLD.halfM || z < -WORLD.halfM || z > WORLD.halfM) return 0;
  let h = 0;
  for (const island of ISLANDS) {
    const bump = islandBump(x, z, island);
    if (bump <= 0) continue;
    const detail =
      valueNoise2D(x, z, 420) * 7 +
      valueNoise2D(x + 31, z - 17, 150) * 3.5;
    // Hills rise toward the middle of the island; the shore stays a beach.
    h += bump * (island.peakM * (0.35 + 0.65 * bump) + detail * bump);
  }
  const pad = runwayFlatten(x, z);
  if (pad.weight > 0) h = h * (1 - pad.weight) + pad.height * pad.weight;
  return h;
}

// Is this point dry land (above the waterline) or open sea?
export function isLand(x, z) {
  return terrainHeight(x, z) > 0.6;
}

// Sample the terrain on a regular grid for the renderer. The grid is
// re-built only when the camera jumps to a new region (see worldRenderer).
export function sampleTerrainGrid(centerX, centerZ, stepM, halfCount) {
  const rows = [];
  for (let j = -halfCount; j <= halfCount; j += 1) {
    const row = [];
    for (let i = -halfCount; i <= halfCount; i += 1) {
      const x = centerX + i * stepM;
      const z = centerZ + j * stepM;
      row.push({ x, z, y: terrainHeight(x, z) });
    }
    rows.push(row);
  }
  return rows;
}
