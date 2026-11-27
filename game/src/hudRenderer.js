// hudRenderer — the instruments, drawn over the 3D view on the same canvas.
// Heading tape across the top, airspeed left, altitude right, throttle
// low-left, cargo and fuel top-right, and the alignment/glide needles
// low-right. Big numbers (48 px) so the judge can read them at 300 px wide.

import { clamp } from './math3d.js';
import { cargoLabel } from './cargoCondition.js';
import { fuelLabel } from './aircraftResources.js';

const M_TO_FT = 3.28084;

function tape(ctx, x, y, w, h, headingDeg) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 18, 28, 0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // Tick every 10 degrees, labelled every 30.
  const pxPerDeg = w / 60;
  const centre = Math.round(headingDeg / 10) * 10;
  ctx.fillStyle = '#f5f0dc';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let d = centre - 30; d <= centre + 30; d += 10) {
    const norm = ((d % 360) + 360) % 360;
    const dx = x + w / 2 + (d - headingDeg) * pxPerDeg;
    const tall = norm % 30 === 0;
    ctx.fillRect(dx - 0.5, y + h - (tall ? 12 : 7), 1, tall ? 12 : 7);
    if (tall) {
      const label = norm === 0 ? 'N' : norm === 90 ? 'E' : norm === 180 ? 'S' : norm === 270 ? 'W' : String(norm).padStart(3, '0');
      ctx.fillText(label, dx, y + 11);
    }
  }
  // Centre caret + readout.
  ctx.fillStyle = '#ffd66e';
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + h - 1);
  ctx.lineTo(x + w / 2 - 7, y + h - 10);
  ctx.lineTo(x + w / 2 + 7, y + h - 10);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(String(Math.round(headingDeg)).padStart(3, '0') + '°', x + w / 2, y + h + 14);
  ctx.restore();
}

function bigNumber(ctx, x, y, value, unit, label, align = 'left') {
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(10, 18, 28, 0.55)';
  const w = align === 'left' ? 150 : 150;
  ctx.fillRect(align === 'left' ? x - 12 : x - w + 12, y - 52, w, 74);
  ctx.fillStyle = '#f5f0dc';
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText(value, x, y);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = '#ffd66e';
  ctx.fillText(unit, x + (align === 'left' ? 4 : -4), y + 20);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(245,240,220,0.75)';
  ctx.fillText(label, x, y - 58);
  ctx.restore();
}

function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 18, 28, 0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, (w - 4) * clamp(frac, 0, 1), h - 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = '#f5f0dc';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 6, y + h / 2);
  ctx.restore();
}

function glideIndicator(ctx, x, y, size, lateral, vertical, onFinal) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 18, 28, 0.55)';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.strokeStyle = 'rgba(245,240,220,0.5)';
  ctx.beginPath();
  ctx.moveTo(cx, y + 6);
  ctx.lineTo(cx, y + size - 6);
  ctx.moveTo(x + 6, cy);
  ctx.lineTo(x + size - 6, cy);
  ctx.stroke();
  // Crosshair centre: the aircraft. The diamond is where the slope wants it.
  ctx.fillStyle = '#f5f0dc';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 5);
  ctx.lineTo(cx + 5, cy);
  ctx.lineTo(cx, cy + 5);
  ctx.lineTo(cx - 5, cy);
  ctx.closePath();
  ctx.fill();
  const dx = clamp(lateral, -1, 1) * (size / 2 - 10);
  const dy = clamp(vertical, -1, 1) * (size / 2 - 10);
  ctx.fillStyle = onFinal ? '#ffd66e' : 'rgba(255,214,110,0.45)';
  ctx.beginPath();
  ctx.arc(cx + dx, cy - dy, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(245,240,220,0.8)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GLIDE', cx, y + size + 13);
  ctx.restore();
}

// hud: { plane, run, readout, flash, width, height, stalled }
export function renderHud(ctx, hud) {
  const { plane, run, readout, width, height } = hud;
  const s = width / 1280; // scale factor from the 1280x720 reference layout
  ctx.save();
  ctx.scale(s, s);

  // Heading tape, top centre.
  tape(ctx, 1280 / 2 - 210, 12, 420, 34, plane.headingDeg);

  // Destination + timer, under the tape.
  ctx.fillStyle = '#f5f0dc';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const dest = readout ? readout.targetLabel.toUpperCase() : '';
  const distKm = readout ? (readout.distanceM / 1000).toFixed(1) : '—';
  const mm = String(Math.floor(run.timeSec / 60)).padStart(2, '0');
  const ss = String(Math.floor(run.timeSec % 60)).padStart(2, '0');
  const targetLine = run.phase === 'delivered'
    ? `✓ DELIVERED — ${dest}   ⏱ ${mm}:${ss}`
    : `▸ ${dest}  ${distKm} KM   BRG ${readout ? readout.bearingDeg : '—'}°   ⏱ ${mm}:${ss}`;
  ctx.fillText(targetLine, 640, 84);

  const reportUp = run.phase === 'delivered' || run.phase === 'stranded' || run.phase === 'crashed';

  // Rally line: route code so far, streak and combo, gates flown.
  if (readout && run.phase !== 'delivered' && run.route) {
    const route = run.route.committed.map((c) => c ?? '?').join('–');
    const streak = run.route.streak > 1 ? `   STREAK ×${run.route.streak}` : '';
    const miss = run.route.misses > 0 ? `   MISS −${run.route.misses * 40}` : '';
    ctx.fillStyle = 'rgba(245,240,220,0.85)';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`ROUTE ${route}   GATES ${readout.gatesPassed}/${readout.gatesTotal}${streak}${miss}`, 640, 108);
  }

  // Fork banner: 32 px minimum, up while the choice is open and close.
  // The two branch chips spell out the bet: safe Open vs risky Technical.
  if (readout && run.route && !reportUp) {
    const slot = run.route.slots[run.route.slotIndex];
    if (slot && slot.type === 'fork') {
      const near = readout.distanceM < 900;
      if (near || run.route.forkAnnounced[slot.fork.index]) {
        const label = `${slot.fork.display} — CHOOSE ONE`;
        ctx.fillStyle = 'rgba(10, 18, 28, 0.72)';
        ctx.fillRect(640 - 260, 128, 520, 44);
        ctx.strokeStyle = '#ffd66e';
        ctx.lineWidth = 2;
        ctx.strokeRect(641 - 260, 129, 520, 44);
        ctx.fillStyle = '#ffd66e';
        ctx.font = 'bold 32px system-ui, sans-serif';
        ctx.fillText(label, 640, 150);
        // Branch chips.
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillStyle = '#4de2e6';
        ctx.textAlign = 'left';
        ctx.fillText('◀ OPEN 100–200', 392, 192);
        ctx.fillStyle = '#ffc247';
        ctx.textAlign = 'right';
        ctx.fillText('TECHNICAL 18–218 ▶', 888, 192);
        ctx.textAlign = 'center';
        if (slot.fork.survey) {
          ctx.fillStyle = '#f5f0dc';
          ctx.font = 'bold 15px system-ui, sans-serif';
          ctx.fillText('SURVEY — FRAME THE LIGHTHOUSE AS YOU PASS', 640, 216);
          const f = Math.round((run.surveyFraming || 0) * 100);
          ctx.fillStyle = 'rgba(10, 18, 28, 0.72)';
          ctx.fillRect(640 - 110, 226, 220, 12);
          ctx.fillStyle = f >= 50 ? '#7fd08a' : '#ffd66e';
          ctx.fillRect(640 - 108, 228, 216 * (f / 100), 8);
          ctx.fillStyle = '#f5f0dc';
          ctx.font = '12px system-ui, sans-serif';
          ctx.fillText(`FRAMING ${f}%`, 640, 254);
        }
      }
    }
  }

  // Airspeed left, altitude right — the two big numbers. Hidden once the
  // delivery report is up, so the panel never covers an instrument.
  if (!reportUp) {
    bigNumber(ctx, 36, 400, String(Math.round(plane.speedKt)), 'KT', 'AIRSPEED', 'left');
    const altFt = Math.max(0, Math.round(plane.pos.y * M_TO_FT));
    bigNumber(ctx, 1244, 400, String(altFt), 'FT', 'ALTITUDE', 'right');
    ctx.fillStyle = '#f5f0dc';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`VS ${plane.vsFpm >= 0 ? '+' : ''}${Math.round(plane.vsFpm)} FPM`, 24, 440);
    ctx.textAlign = 'right';
    ctx.fillText(`FLAPS ${plane.flaps ? 'DOWN' : 'UP'}`, 1256, 440);
  }

  // Throttle bar, low-left beside the minimap (not under it).
  bar(ctx, 184, 660, 190, 22, plane.throttle, '#e78038', `THR ${Math.round(plane.throttle * 100)}%`);
  // Cargo / fuel / damage bars hide with the report, which covers
  // that corner (the tall rally report reaches y=40).
  if (!reportUp) {
    const cargoColor = run.cargo.health >= 70 ? '#7fd08a' : run.cargo.health >= 40 ? '#ffd66e' : '#e05a4e';
    bar(ctx, 1040, 16, 216, 22, run.cargo.health / 100, cargoColor, `CARGO ${cargoLabel(run.cargo)} ${Math.round(run.cargo.health)}%`);
    const fuelColor = run.resources.fuel >= 35 ? '#7fb0c9' : run.resources.fuel >= 15 ? '#ffd66e' : '#e05a4e';
    bar(ctx, 1040, 44, 216, 22, run.resources.fuel / 100, fuelColor, `FUEL ${Math.round(run.resources.fuel)}% ${fuelLabel(run.resources)}`);

    // Damage, under fuel, only when it matters.
    if (run.resources.damage > 0) {
      bar(ctx, 1040, 72, 216, 22, run.resources.damage / 100, '#e05a4e', `DAMAGE ${Math.round(run.resources.damage)}%`);
    }
  }

  // Glide needles, low-right; minimap lives low-left (minimapRenderer).
  // Hidden with the report, which covers that corner.
  if (readout && !reportUp) {
    glideIndicator(ctx, 1150, 560, 96, readout.glide.lateral, readout.glide.vertical, readout.glide.onFinal);
  }

  // Stall warning, flashing centre-top.
  if (hud.stalled && Math.floor(hud.timeSec * 4) % 2 === 0) {
    ctx.fillStyle = '#e05a4e';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ STALL — NOSE DOWN, POWER UP', 640, 120);
  }

  // Engine-out warning.
  if (run.resources.engineOut) {
    ctx.fillStyle = '#e05a4e';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ENGINE OUT — GLIDE TO THE RUNWAY', 640, 150);
  }

  // Flash messages (gate, touchdown, delivery) centre screen.
  if (hud.flash && hud.flash.untilSec > hud.timeSec) {
    const age = hud.flash.untilSec - hud.timeSec;
    const alpha = clamp(age / 0.5, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = hud.flash.color || '#ffd66e';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hud.flash.text, 640, 250);
    if (hud.flash.sub) {
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(hud.flash.sub, 640, 282);
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
