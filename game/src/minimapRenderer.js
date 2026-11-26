// minimapRenderer — the 144x144 chart, low-left, default on.
// Islands as sand blobs, runways as strips, gates as rings, the Tidewing
// as a triangle pointing where it is going. North up, the whole 8 km
// square fitted in.

import { ISLANDS, RUNWAYS, WORLD } from './config.js';
import { headingForwardDeg } from './math3d.js';

export function renderMinimap(ctx, map) {
  const { plane, nav, mission, x, y, size } = map;
  const scale = size / WORLD.sizeM;
  const toMap = (wx, wz) => ({
    x: x + (wx + WORLD.halfM) * scale,
    y: y + (wz + WORLD.halfM) * scale,
  });

  ctx.save();
  // Panel.
  ctx.fillStyle = 'rgba(10, 18, 28, 0.6)';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

  // Sea.
  ctx.fillStyle = '#173b52';
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

  // Islands.
  for (const island of ISLANDS) {
    const c = toMap(island.center.x, island.center.z);
    ctx.fillStyle = '#7fae62';
    ctx.beginPath();
    ctx.arc(c.x, c.y, island.radiusM * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8d9b3';
    ctx.beginPath();
    ctx.arc(c.x, c.y, island.radiusM * scale * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  // Runways.
  for (const runway of Object.values(RUNWAYS)) {
    const f = headingForwardDeg(runway.headingDeg);
    const a = toMap(runway.center.x - f.x * runway.lengthM / 2, runway.center.z - f.z * runway.lengthM / 2);
    const b = toMap(runway.center.x + f.x * runway.lengthM / 2, runway.center.z + f.z * runway.lengthM / 2);
    ctx.strokeStyle = runway.id === mission.to ? '#ffd66e' : '#f5f0dc';
    ctx.lineWidth = runway.id === mission.to ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // Gates.
  for (const gate of nav.gates) {
    const g = toMap(gate.pos.x, gate.pos.z);
    ctx.strokeStyle = gate.passed ? 'rgba(120,220,140,0.9)' : 'rgba(255,214,110,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(g.x, g.y, Math.max(2, gate.radiusM * scale), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Destination marker.
  const dest = RUNWAYS[mission.to];
  const d = toMap(dest.center.x, dest.center.z);
  ctx.fillStyle = '#ffd66e';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✦', d.x, d.y - 6);

  // The aircraft: a triangle pointing along its heading.
  const p = toMap(plane.pos.x, plane.pos.z);
  const h = plane.headingDeg * (Math.PI / 180);
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e78038';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.x + fx * 7, p.y + fz * 7);
  ctx.lineTo(p.x - fz * 5 - fx * 4, p.y + fx * 5 - fz * 4);
  ctx.lineTo(p.x + fz * 5 - fx * 4, p.y - fx * 5 - fz * 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(245,240,220,0.8)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('N ↑', x + 5, y + 12);
  ctx.restore();
}
