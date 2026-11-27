// missionController — the rally's state machine and its referee.
// briefing → ground roll → airborne (9 gates, 3 forks) → touchdown →
// rollout → delivered, with crash, stranded and out-of-fuel endings on
// the way. It owns the timer, the route, the cargo, the fuel and the
// delivery check, and it hands the score to scoringSystem.js when the
// wheels finally stop.
//
// A miss does not end the run: the route controller orders a mandatory
// retry (Safe-Approach Respawn 150 m before the gate, or the R key for
// an instant one). After 2 consecutive fails the gate is skipped for
// 0 points. Delivery still succeeds only when the aircraft stops
// (<= 3 kt for 1 second) on the destination runway.

import { RUNWAYS, missionById } from './config.js';
import { clamp } from './math3d.js';
import { createAircraftState } from './flightPhysics.js';
import { createCargo, updateCargoCondition, applyTouchdownCargoDamage } from './cargoCondition.js';
import { createResources, updateFuel } from './aircraftResources.js';
import { createNavigation } from './navigationSystem.js';
import { classifyTouchdown } from './landingEvaluator.js';
import { calculateDeliveryScore } from './scoringSystem.js';
import { updateRoute, respawnPose, routeCode } from './routeController.js';

export const PHASES = ['briefing', 'ground', 'airborne', 'rollout', 'delivered', 'crashed', 'stranded'];

export function createMissionRun(missionId) {
  const mission = missionById(missionId);
  const fromRunway = RUNWAYS[mission.from];
  const plane = createAircraftState(mission, fromRunway);
  plane.sensitivity = mission.cargo.sensitivity;
  const nav = createNavigation(missionId);
  return {
    mission,
    plane,
    nav,
    route: nav.route,
    cargo: createCargo(mission.cargo.sensitivity),
    resources: createResources(mission.fuel),
    phase: 'briefing',
    timeSec: 0,
    timerRunning: false,
    stopTimerSec: 0,
    touchdown: null,
    landing: null,
    score: null,
    events: [],
    message: null,
    messageTimerSec: 0,
    surveyFraming: 0,
  };
}

export function startMissionRun(run) {
  run.phase = 'ground';
  run.events.push({ type: 'missionStart' });
}

function runwayUnder(plane) {
  // The nearest runway strip the aircraft is over, if any.
  let best = null;
  let bestDist = Infinity;
  for (const runway of Object.values(RUNWAYS)) {
    const dx = plane.pos.x - runway.center.x;
    const dz = plane.pos.z - runway.center.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < bestDist) {
      bestDist = dist;
      best = runway;
    }
  }
  if (!best) return null;
  const h = best.headingDeg * (Math.PI / 180);
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const rx = -fz;
  const rz = fx;
  const dx = plane.pos.x - best.center.x;
  const dz = plane.pos.z - best.center.z;
  const along = dx * fx + dz * fz;
  const across = dx * rx + dz * rz;
  const onStrip =
    Math.abs(along) <= best.lengthM / 2 + 12 &&
    Math.abs(across) <= best.widthM / 2 + 6 &&
    Math.abs(plane.pos.y - best.elevationM) < 12;
  return onStrip ? best : null;
}

// The Safe-Approach Respawn: put the aircraft 150 m before the missed
// gate (or fork), on the leg heading at gate altitude, 65 kt, airborne.
export function applyRespawn(run, target) {
  const pose = respawnPose(run.route, target);
  const plane = run.plane;
  plane.pos = { ...pose.pos };
  plane.headingDeg = pose.headingDeg;
  plane.pitchDeg = 0;
  plane.bankDeg = 0;
  plane.speedKt = pose.speedKt;
  plane.vsFpm = 0;
  plane.throttle = 0.6;
  plane.flaps = false;
  plane.onGround = false;
  plane.airborne = true;
  plane.airborneOnce = true;
  run.phase = 'airborne';
}

export function updateMissionRun(run, dt, physicsEvent) {
  const { plane } = run;
  const events = [];

  // Which runway, if any, is under the wheels right now.
  const strip = runwayUnder(plane);
  plane.overRunway = strip !== null;
  if (strip) plane.runwayHeadingDeg = strip.headingDeg;

  if (run.phase === 'airborne' || run.phase === 'ground') {
    updateFuel(run.resources, plane, dt);
    if (run.resources.engineOut && !run.engineOutAnnounced) {
      run.engineOutAnnounced = true;
      events.push({ type: 'engineOut' });
    }
    if (run.resources.fuel < 15 && !run.fuelLowAnnounced) {
      run.fuelLowAnnounced = true;
      events.push({ type: 'fuelLow' });
    }
  }
  if (run.phase === 'airborne') {
    updateCargoCondition(run.cargo, plane, dt);
    const routeEvents = updateRoute(run.route, plane, dt, run.surveyFraming);
    for (const e of routeEvents) {
      if (e.type === 'respawn') {
        applyRespawn(run, e.target);
        events.push({ type: 'respawned', target: e.target });
      } else {
        events.push(e);
      }
    }
    if (run.timerRunning) run.timeSec += dt;
  }

  if (physicsEvent === 'liftoff') {
    run.phase = 'airborne';
    plane.airborneOnce = true;
    run.timerRunning = true;
    events.push({ type: 'liftoff' });
  }

  if (physicsEvent && physicsEvent.type === 'touchdown') {
    const landing = classifyTouchdown(physicsEvent);
    run.touchdown = physicsEvent;
    run.landing = landing;
    applyTouchdownCargoDamage(run.cargo, landing.kind, physicsEvent.vsFpm);
    events.push({ type: 'touchdown', landing });
    if (landing.kind === 'crash') {
      run.phase = 'crashed';
      run.timerRunning = false;
      run.score = calculateDeliveryScore(run);
      events.push({ type: 'crashed', landing });
    } else {
      run.phase = 'rollout';
      run.stopTimerSec = 0;
    }
  }

  if (run.phase === 'rollout') {
    if (plane.speedKt <= 3) {
      run.stopTimerSec += dt;
      if (run.stopTimerSec >= 1) {
        const dest = RUNWAYS[run.mission.to];
        if (strip && strip.id === dest.id) {
          run.phase = 'delivered';
          run.timerRunning = false;
          run.score = calculateDeliveryScore(run);
          events.push({ type: 'delivered', score: run.score });
        } else {
          run.phase = 'stranded';
          run.timerRunning = false;
          run.score = calculateDeliveryScore(run);
          events.push({ type: 'stranded', score: run.score });
        }
      }
    } else {
      run.stopTimerSec = 0;
    }
    // Rolling off the end of the strip into the rough at speed hurts.
    if (!strip && plane.speedKt > 25) {
      run.resources.damage = clamp(run.resources.damage + 12 * dt, 0, 100);
    }
  }

  run.events = events;
  return events;
}

export function missionProgress(run) {
  return {
    phase: run.phase,
    timeSec: run.timeSec,
    parSec: run.mission.parSec,
    capSec: run.mission.capSec,
    fuel: run.resources.fuel,
    damage: run.resources.damage,
    cargoHealth: run.cargo.health,
    gatesPassed: run.nav.graph.gates.filter((g) => g.active && g.passed).length,
    gatesTotal: run.nav.graph.flownCount,
    routeCode: routeCode(run.route),
    streak: run.route.streak,
    misses: run.route.misses,
  };
}
