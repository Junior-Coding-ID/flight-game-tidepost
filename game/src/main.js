// main — TIDEPOST: ISLAND AIRMAIL. Bootstrap, the game loop, and the
// screen flow: menu → briefing → flying → delivered / crashed.
// The loop is fixed-timestep-ish (dt clamped), the canvas is a fixed
// 1280x720 backing store scaled by CSS, and ?shot=N freezes a posed
// frame for screenshots.

import { MISSIONS, RUNWAYS, CONTROLS, FLIGHT } from './config.js';
import { clamp } from './math3d.js';
import { terrainHeight } from './terrainGenerator.js';
import { updateFlightDynamics } from './flightPhysics.js';
import { createMissionRun, startMissionRun, updateMissionRun, missionProgress } from './missionController.js';
import { navigationReadout } from './navigationSystem.js';
import { renderWorld } from './worldRenderer.js';
import { renderHud } from './hudRenderer.js';
import { renderMinimap } from './minimapRenderer.js';
import {
  renderMenu, renderBriefing, renderPause, renderHelp, renderCrash,
  renderReport, missionMenuData,
} from './presentationSystem.js';
import {
  createInput, attachInput, wasPressed, endFrameInput, readAxes,
} from './input.js';
import {
  createAudio, resumeAudio, updateAudio, playGateChime, playTouchdown,
  playDeliveryFanfare, playCrash, playClick,
} from './audio.js';
import {
  createParticles, spawnTouchdownSmoke, spawnGateBurst, updateParticles,
} from './particles.js';
import {
  createCamera, cycleCameraMode, resetCamera, addCameraShake,
  updateChaseCamera,
} from './chaseCamera.js';
import { parseShotParam, applyShotPose } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 1280;
canvas.height = 720;

const input = createInput();
attachInput(input, canvas);
const audio = createAudio();
const particles = createParticles();
const camera = createCamera();

let screen = 'menu'; // menu | briefing | flying | paused | help | over
let menuIndex = 0;
let showMinimap = true;
let run = createMissionRun('M01');
let flash = null;
let timeSec = 0;
let restartHoldSec = 0;
let prevScreenBeforeHelp = 'menu';
let bestScores = loadBestScores();

function loadBestScores() {
  try {
    return JSON.parse(window.localStorage.getItem('tidepost-best') || '{}');
  } catch {
    return {};
  }
}

function saveBestScores() {
  try {
    window.localStorage.setItem('tidepost-best', JSON.stringify(bestScores));
  } catch {
    // Storage may be unavailable (hosted entry): best scores are a bonus.
  }
}

function startBriefing(missionId) {
  run = createMissionRun(missionId);
  run.fromName = missionMenuData().find((m) => m.id === missionId).fromName;
  run.toName = missionMenuData().find((m) => m.id === missionId).toName;
  screen = 'briefing';
}

function startFlying() {
  startMissionRun(run);
  screen = 'flying';
  flash = null;
  resumeAudio(audio);
  playClick(audio);
}

function backToMenu() {
  run = createMissionRun(MISSIONS[menuIndex].id);
  screen = 'menu';
}

function showFlash(text, sub, color, durSec = 2.2) {
  flash = { text, sub: sub || '', color: color || '#ffd66e', untilSec: timeSec + durSec };
}

function handleMissionEvents(events) {
  for (const e of events) {
    if (e.type === 'liftoff') {
      showFlash('AIRBORNE', 'Gear up in spirit — fly the gates', '#7fd08a');
      playClick(audio);
    } else if (e.type === 'gate') {
      showFlash(`GATE +${e.gate.points}`, e.gate.label, '#7fd08a');
      spawnGateBurst(particles, e.gate.pos);
      playGateChime(audio);
    } else if (e.type === 'touchdown') {
      const hard = e.landing.kind === 'hard' || e.landing.kind === 'crash';
      spawnTouchdownSmoke(particles, run.plane, hard);
      addCameraShake(camera, hard ? 0.9 : 0.35);
      showFlash(e.landing.label, e.landing.reason, hard ? '#e05a4e' : '#7fd08a', 2.6);
      playTouchdown(audio, hard);
    } else if (e.type === 'delivered') {
      screen = 'over';
      playDeliveryFanfare(audio);
      const prev = bestScores[run.mission.id] || 0;
      if (e.score.total > prev) {
        bestScores[run.mission.id] = e.score.total;
        saveBestScores();
      }
    } else if (e.type === 'stranded') {
      screen = 'over';
      showFlash('STRANDED', 'Stopped off the destination runway', '#ffd66e');
    } else if (e.type === 'crashed') {
      screen = 'over';
      playCrash(audio);
      addCameraShake(camera, 1);
    } else if (e.type === 'fuelLow') {
      showFlash('FUEL LOW', 'Mind the gauge — the sea is not a runway', '#e05a4e', 3);
    } else if (e.type === 'engineOut') {
      showFlash('ENGINE OUT', 'Glide it in — flaps help, speed is life', '#e05a4e', 3.5);
    }
  }
}

function updateFlying(dt) {
  const axes = readAxes(input);
  const plane = run.plane;

  // Throttle: I/K held, wheel nudges, clamped 0..1.
  if (input.keys.has(CONTROLS.throttleUp)) plane.throttle = clamp(plane.throttle + 0.55 * dt, 0, 1);
  if (input.keys.has(CONTROLS.throttleDown)) plane.throttle = clamp(plane.throttle - 0.55 * dt, 0, 1);
  if (axes.throttleDelta) plane.throttle = clamp(plane.throttle + axes.throttleDelta, 0, 1);

  // Flaps toggle on a fresh press.
  if (wasPressed(input, CONTROLS.flaps)) {
    plane.flaps = !plane.flaps;
    playClick(audio);
  }
  if (wasPressed(input, CONTROLS.camera)) cycleCameraMode(camera);
  if (wasPressed(input, CONTROLS.cameraReset)) resetCamera(camera);
  if (wasPressed(input, CONTROLS.minimap)) showMinimap = !showMinimap;
  camera.freeLook.yaw = input.look.yaw;
  camera.freeLook.pitch = input.look.pitch;

  // Pause.
  if (wasPressed(input, CONTROLS.pause) || wasPressed(input, CONTROLS.pauseAlt)) {
    screen = 'paused';
    return;
  }
  // Restart: hold R for 0.6 s.
  if (input.keys.has(CONTROLS.restart)) {
    restartHoldSec += dt;
    if (restartHoldSec >= 0.6) {
      restartHoldSec = 0;
      startBriefing(run.mission.id);
      return;
    }
  } else {
    restartHoldSec = 0;
  }

  const { event } = updateFlightDynamics(plane, axes, dt, terrainHeight);
  const events = updateMissionRun(run, dt, event);
  handleMissionEvents(events);
  updateParticles(particles, dt);
  updateAudio(audio, plane, dt);
}

function renderFlying() {
  const plane = run.plane;
  const { eye, target } = updateChaseCamera(camera, plane, 1 / 60);
  renderWorld(ctx, {
    width: 1280, height: 720, eye, target, plane,
    gates: run.nav.gates, particles, timeSec,
  });
  const readout = navigationReadout(plane, run.nav, run.mission);
  const stallKt = plane.flaps ? FLIGHT.stallFlapKt : FLIGHT.stallCleanKt;
  renderHud(ctx, {
    plane, run, readout, flash, width: 1280, height: 720,
    timeSec, stalled: plane.airborne && plane.speedKt < stallKt,
  });
  if (showMinimap) {
    renderMinimap(ctx, {
      plane, nav: run.nav, mission: run.mission, x: 24, y: 552, size: 144,
    });
  }
  if (screen === 'paused') renderPause(ctx, 1280, 720);
  if (screen === 'over' && run.phase === 'delivered') renderReport(ctx, run, 1280, 720);
  if (screen === 'over' && run.phase === 'stranded') renderReport(ctx, run, 1280, 720);
  if (screen === 'over' && run.phase === 'crashed') renderCrash(ctx, run, 1280, 720);
}

function renderMenuScene() {
  // A slow orbit over Mailhaven behind the title screen.
  const t = timeSec * 0.05;
  const eye = {
    x: -2400 + Math.cos(t) * 900,
    y: 320,
    z: -1800 + Math.sin(t) * 900,
  };
  const target = { x: -2400, y: 20, z: -1800 };
  const ghost = {
    pos: { x: -2400, y: 6.8, z: -1800 },
    headingDeg: 300, pitchDeg: 0, bankDeg: 0, propSpinRad: timeSec * 8,
  };
  renderWorld(ctx, {
    width: 1280, height: 720, eye, target, plane: ghost,
    gates: [], particles, timeSec,
  });
  const state = {
    missions: missionMenuData(),
    selectedMission: menuIndex,
    bestScores,
  };
  renderMenu(ctx, state, 1280, 720);
}

function frame(nowMs) {
  const dt = 1 / 60;
  timeSec += dt;

  if (screen === 'menu') {
    if (wasPressed(input, 'ArrowLeft') || wasPressed(input, 'KeyA')) menuIndex = (menuIndex + 2) % 3;
    if (wasPressed(input, 'ArrowRight') || wasPressed(input, 'KeyD')) menuIndex = (menuIndex + 1) % 3;
    if (wasPressed(input, 'Enter')) {
      startBriefing(MISSIONS[menuIndex].id);
      playClick(audio);
      resumeAudio(audio);
    }
    if (wasPressed(input, CONTROLS.help)) {
      prevScreenBeforeHelp = 'menu';
      screen = 'help';
    }
    renderMenuScene();
  } else if (screen === 'briefing') {
    renderMenuScene();
    renderBriefing(ctx, run, 1280, 720);
    if (wasPressed(input, 'Enter')) startFlying();
    if (wasPressed(input, CONTROLS.pause)) backToMenu();
  } else if (screen === 'flying') {
    updateFlying(dt);
    renderFlying();
  } else if (screen === 'paused') {
    renderFlying();
    if (wasPressed(input, CONTROLS.pause) || wasPressed(input, CONTROLS.pauseAlt)) screen = 'flying';
    if (wasPressed(input, CONTROLS.help)) {
      prevScreenBeforeHelp = 'paused';
      screen = 'help';
    }
    if (input.keys.has(CONTROLS.restart)) {
      restartHoldSec += dt;
      if (restartHoldSec >= 0.6) {
        restartHoldSec = 0;
        startBriefing(run.mission.id);
      }
    } else {
      restartHoldSec = 0;
    }
  } else if (screen === 'help') {
    if (screen === 'help') renderHelp(ctx, 1280, 720);
    if (wasPressed(input, CONTROLS.help) || wasPressed(input, CONTROLS.pause)) {
      screen = prevScreenBeforeHelp === 'paused' ? 'paused' : prevScreenBeforeHelp === 'flying' ? 'flying' : 'menu';
      if (screen === 'menu') renderMenuScene();
    }
  } else if (screen === 'over') {
    renderFlying();
    if (wasPressed(input, CONTROLS.restart)) startBriefing(run.mission.id);
    if (wasPressed(input, CONTROLS.pause)) backToMenu();
  }

  endFrameInput(input);
  requestAnimationFrame(frame);
}

// --- screenshot poses (?shot=1..4): freeze a real rendered frame ------------
const shot = parseShotParam();
if (shot) {
  const missionId = shot === 3 ? 'M02' : 'M01';
  run = createMissionRun(missionId);
  run.fromName = missionMenuData().find((m) => m.id === missionId).fromName;
  run.toName = missionMenuData().find((m) => m.id === missionId).toName;
  const pose = applyShotPose(run, camera, shot);
  screen = 'flying';
  // Frozen: render the posed frame every animation frame, no simulation.
  const renderShot = () => {
    timeSec += 1 / 60;
    const plane = run.plane;
    const { eye, target } = updateChaseCamera(camera, plane, 1 / 60);
    renderWorld(ctx, {
      width: 1280, height: 720, eye, target, plane,
      gates: run.nav.gates, particles, timeSec,
    });
    const readout = navigationReadout(plane, run.nav, run.mission);
    renderHud(ctx, {
      plane, run, readout, flash, width: 1280, height: 720,
      timeSec, stalled: false,
    });
    renderMinimap(ctx, { plane, nav: run.nav, mission: run.mission, x: 24, y: 552, size: 144 });
    if (pose.showReport) renderReport(ctx, run, 1280, 720);
    requestAnimationFrame(renderShot);
  };
  requestAnimationFrame(renderShot);
} else {
  requestAnimationFrame(frame);
}

// Debug hook for automated playtests (headless): read-only state.
window.__tidepost = {
  get screen() { return screen; },
  get phase() { return run.phase; },
  get score() { return run.score; },
  get plane() {
    return {
      x: run.plane.pos.x, y: run.plane.pos.y, z: run.plane.pos.z,
      headingDeg: run.plane.headingDeg, speedKt: run.plane.speedKt,
      fuel: run.resources.fuel, cargo: run.cargo.health,
    };
  },
  get progress() { return missionProgress(run); },
};
