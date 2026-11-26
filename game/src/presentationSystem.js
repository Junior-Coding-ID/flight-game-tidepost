// presentationSystem — everything that is not the flight itself: the title
// screen, the mission briefing, the pause and help overlays, the crash
// panel and the delivery report. All canvas-drawn, same palette as the HUD.
// The report panel stays narrow (max 34% of the frame) so the delivered
// aircraft stays visible beside it.

import { MISSIONS } from './config.js';
import { cargoLabel } from './cargoCondition.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10, 18, 28, 0.93)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255, 214, 110, 0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function title(ctx, x, y, text, size, color) {
  ctx.fillStyle = color || '#f5f0dc';
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function line(ctx, x, y, text, size, color, align = 'center') {
  ctx.fillStyle = color || 'rgba(245,240,220,0.9)';
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

export function renderMenu(ctx, state, width, height) {
  const cx = width / 2;
  // A translucent veil over the orbiting 3D world behind the title.
  ctx.fillStyle = 'rgba(23, 59, 82, 0.62)';
  ctx.fillRect(0, 0, width, height);
  // A warm band for the sun, low on the screen.
  const sun = ctx.createLinearGradient(0, height * 0.45, 0, height);
  sun.addColorStop(0, 'rgba(242, 192, 120, 0)');
  sun.addColorStop(1, 'rgba(242, 192, 120, 0.55)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, height * 0.45, width, height * 0.55);

  title(ctx, cx, 110, 'TIDEPOST', 84, '#f5f0dc');
  title(ctx, cx, 168, 'I S L A N D   A I R M A I L', 24, '#ffd66e');
  line(ctx, cx, 210, 'Pulau kecil. Kiriman penting. Satu pesawat.', 18, 'rgba(245,240,220,0.85)');

  // Mission cards, one row of three.
  const cardW = 300;
  const cardH = 190;
  const gap = 24;
  const x0 = cx - (cardW * 3 + gap * 2) / 2;
  state.missions.forEach((m, i) => {
    const x = x0 + i * (cardW + gap);
    const y = 260;
    const selected = i === state.selectedMission;
    ctx.fillStyle = selected ? 'rgba(255, 214, 110, 0.18)' : 'rgba(10, 18, 28, 0.55)';
    ctx.fillRect(x, y, cardW, cardH);
    ctx.strokeStyle = selected ? '#ffd66e' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = selected ? 3 : 1;
    ctx.strokeRect(x + 1, y + 1, cardW - 2, cardH - 2);
    line(ctx, x + cardW / 2, y + 30, `${m.code} — ${m.name.toUpperCase()}`, 17, '#ffd66e');
    line(ctx, x + cardW / 2, y + 62, `${m.fromName} → ${m.toName}`, 15);
    line(ctx, x + cardW / 2, y + 90, `${m.difficulty}  •  ${m.cargoLabel}`, 14, 'rgba(245,240,220,0.8)');
    line(ctx, x + cardW / 2, y + 118, `Par ${m.parSec}s  •  Fuel ${m.fuel}`, 14, 'rgba(245,240,220,0.8)');
    const best = state.bestScores[m.id];
    line(ctx, x + cardW / 2, y + 150, best ? `Best ${best} / 1000  ${bestMedal(best, m)}` : 'Not flown yet', 14, best ? '#7fd08a' : 'rgba(245,240,220,0.6)');
  });

  line(ctx, cx, 500, '← → choose a mission   •   ENTER fly   •   H help', 16);
  line(ctx, cx, 530, 'W/S pitch   A/D roll   Q/E yaw   I/K throttle   F flaps   B brake   C camera   M map', 14, 'rgba(245,240,220,0.7)');
  line(ctx, cx, 560, 'Keyboard alone can fly every mission. Mouse: hold left to steer, wheel for throttle.', 14, 'rgba(245,240,220,0.7)');
  line(ctx, cx, height - 30, 'TIDEPOST v1.1 — an original game. Fly the mail home.', 13, 'rgba(245,240,220,0.55)');
}

function bestMedal(score, m) {
  if (score >= m.medals.gold) return '🥇';
  if (score >= m.medals.silver) return '🥈';
  if (score >= m.medals.bronze) return '🥉';
  return '';
}

export function renderBriefing(ctx, run, width, height) {
  const m = run.mission;
  const w = 620;
  const h = 330;
  const x = (width - w) / 2;
  const y = (height - h) / 2 - 20;
  panel(ctx, x, y, w, h);
  title(ctx, width / 2, y + 42, `${m.code} — ${m.name.toUpperCase()}`, 30, '#ffd66e');
  line(ctx, width / 2, y + 82, `${run.fromName} → ${run.toName}  •  ${m.difficulty}`, 17);
  // Word-wrap the briefing.
  const words = m.briefing.split(' ');
  let row = '';
  let ly = y + 128;
  ctx.textAlign = 'center';
  for (const word of words) {
    if ((row + ' ' + word).trim().length > 62) {
      line(ctx, width / 2, ly, row.trim(), 15);
      ly += 24;
      row = word;
    } else {
      row += ' ' + word;
    }
  }
  if (row.trim()) line(ctx, width / 2, ly, row.trim(), 15);
  ly += 34;
  line(ctx, width / 2, ly, `Cargo: ${m.cargo.label}  •  Par ${m.parSec}s  •  Fuel ${m.fuel}  •  Medals ${m.medals.bronze}/${m.medals.silver}/${m.medals.gold}`, 14, '#ffd66e');
  line(ctx, width / 2, ly + 28, m.tips, 14, 'rgba(245,240,220,0.8)');
  line(ctx, width / 2, y + h - 34, 'ENTER — start the engine    •    ESC — back', 15);
}

export function renderPause(ctx, width, height) {
  ctx.fillStyle = 'rgba(8, 14, 22, 0.6)';
  ctx.fillRect(0, 0, width, height);
  title(ctx, width / 2, height / 2 - 40, 'PAUSED', 48, '#ffd66e');
  line(ctx, width / 2, height / 2 + 16, 'ESC / P — resume      R — restart mission      H — help', 16);
}

export function renderHelp(ctx, width, height) {
  const w = 640;
  const h = 430;
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  panel(ctx, x, y, w, h);
  title(ctx, width / 2, y + 40, 'HOW TO FLY', 28, '#ffd66e');
  const rows = [
    ['W / S', 'Pitch down / up (nose)'],
    ['A / D', 'Roll left / right — bank to turn'],
    ['Q / E', 'Rudder — nudge the nose'],
    ['I / K', 'Throttle up / down'],
    ['F', 'Flaps — slower stall, more drag'],
    ['B / Space', 'Brakes on the ground'],
    ['C / V', 'Camera mode / reset view'],
    ['M', 'Minimap on / off'],
    ['Mouse', 'Hold left = virtual stick, wheel = throttle'],
    ['R (hold)', 'Restart the mission'],
    ['Esc / P', 'Pause'],
  ];
  let ly = y + 84;
  for (const [keys, what] of rows) {
    line(ctx, x + 150, ly, keys, 15, '#ffd66e', 'right');
    line(ctx, x + 170, ly, what, 15, 'rgba(245,240,220,0.9)', 'left');
    ly += 28;
  }
  line(ctx, width / 2, y + h - 26, 'Land slow and straight: VS under 300 fpm, 38–72 kt, wings level.', 14, '#ffd66e');
}

export function renderCrash(ctx, run, width, height) {
  const w = 560;
  const h = 250;
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  panel(ctx, x, y, w, h);
  title(ctx, width / 2, y + 44, 'CRASHED', 36, '#e05a4e');
  line(ctx, width / 2, y + 92, run.landing ? run.landing.reason : 'THE AIRCRAFT WAS LOST', 18, '#f5f0dc');
  const cargo = run.cargo.health;
  line(ctx, width / 2, y + 126, `Cargo survived: ${Math.round(cargo)}% (${cargoLabel(run.cargo)})`, 15);
  line(ctx, width / 2, y + 158, run.score ? `Score ${run.score.total} / 1000 — no landing points` : 'No score — the mail never arrived', 15, 'rgba(245,240,220,0.8)');
  line(ctx, width / 2, y + h - 34, 'R — fly it again      ESC — menu', 15);
}

export function renderReport(ctx, run, width, height) {
  const score = run.score;
  const w = 430; // <= 34% of a 1280 frame: the aircraft stays visible.
  const h = 400;
  const x = width - w - 32;
  const y = (height - h) / 2;
  panel(ctx, x, y, w, h);
  const cx = x + w / 2;
  title(ctx, cx, y + 40, score.delivered ? 'DELIVERED!' : 'STRANDED', 30, score.delivered ? '#7fd08a' : '#ffd66e');
  title(ctx, cx, y + 88, `${score.total} / 1000`, 44, '#ffd66e');
  line(ctx, cx, y + 122, score.medal === 'NONE' ? 'No medal this time' : `${score.medal} MEDAL`, 16, score.medal === 'NONE' ? 'rgba(245,240,220,0.7)' : '#ffd66e');
  const b = score.breakdown;
  const rows = [
    ['Cargo', `${b.cargo} / 350`, `${Math.round(run.cargo.health)}% intact`],
    ['Landing', `${b.landing} / 350`, run.landing ? run.landing.label : '—'],
    ['Time', `${b.time} / 200`, `${score.timeSec}s (par ${run.mission.parSec}s)`],
    ['Gates', `${b.gates} / 100`, `${b.gatesPassed} of ${b.gatesTotal} flown`],
  ];
  let ly = y + 168;
  for (const [label, pts, note] of rows) {
    line(ctx, x + 24, ly, label, 16, 'rgba(245,240,220,0.9)', 'left');
    line(ctx, x + w - 24, ly, pts, 16, '#f5f0dc', 'right');
    line(ctx, x + 24, ly + 20, note, 12, 'rgba(245,240,220,0.6)', 'left');
    ly += 48;
  }
  line(ctx, cx, y + h - 30, 'R — fly again      ESC — menu', 14);
}

export function missionMenuData() {
  return MISSIONS.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    fromName: m.from === 'mailhaven' ? 'Mailhaven' : m.from === 'pelican' ? 'Pelican Bay' : 'Cloudreach',
    toName: m.to === 'mailhaven' ? 'Mailhaven' : m.to === 'pelican' ? 'Pelican Bay' : 'Cloudreach',
    difficulty: m.difficulty,
    cargoLabel: m.cargo.label,
    parSec: m.parSec,
    fuel: m.fuel,
    medals: m.medals,
  }));
}
