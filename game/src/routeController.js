// routeController — the rally's referee: forks, misses and retries.
// The route is a sequence of 9 slots: 6 shared gates and 3 fork slots.
// A fork slot is decided the moment the aircraft flies through one of
// its two branch gates; the other branch goes inactive (dimmed to 0.2).
// A gate is missed when the aircraft crosses its plane without hitting
// it: -40 points and a mandatory retry through a Safe-Approach Respawn
// 150 m before the gate (or the R key for an instant one). After 2
// consecutive fails on the same gate it is skipped for 0 points (-80
// total). There is no auto-advance on the first miss: a 12-checkpoint
// rally that lets you skip a gate is not a rally.

import { SCORING, RALLY } from './config.js';
import { gateHit, gatePrecision, gateLocalOffset } from './gateGeometry.js';
import { routeCodeFor } from './routeGraph.js';

// Slots in flying order: a fork slot holds both branch gates until one
// is committed.
export function buildSlots(graph) {
  const byId = new Map(graph.gates.map((g) => [g.id, g]));
  return [
    { type: 'gate', gate: byId.get('S1') },
    { type: 'gate', gate: byId.get('S2') },
    { type: 'fork', fork: graph.forks[0], gates: [byId.get('O01'), byId.get('T01')] },
    { type: 'gate', gate: byId.get('S3') },
    { type: 'fork', fork: graph.forks[1], gates: [byId.get('O02'), byId.get('T02')] },
    { type: 'gate', gate: byId.get('S4') },
    { type: 'fork', fork: graph.forks[2], gates: [byId.get('O03'), byId.get('T03')] },
    { type: 'gate', gate: byId.get('S5') },
    { type: 'gate', gate: byId.get('S6') },
  ];
}

export function createRouteState(graph) {
  return {
    graph,
    slots: buildSlots(graph),
    slotIndex: 0,
    committed: [null, null, null],
    streak: 0,
    bestStreak: 0,
    misses: 0,
    retries: {},
    forkAnnounced: [false, false, false],
    pendingRespawn: null,
    respawnTimerSec: 0,
    survey: null,
    finished: false,
  };
}

export function currentSlot(route) {
  return route.slots[route.slotIndex] ?? null;
}

// The navigation target: the next gate, or the fork midpoint while the
// choice is still open (both branch gates count as the target).
export function currentTarget(route) {
  const slot = currentSlot(route);
  if (!slot) return null;
  if (slot.type === 'gate') return slot.gate;
  return {
    id: `fork${slot.fork.index}`,
    label: `${slot.fork.display} — CHOOSE ONE`,
    pos: slot.fork.midpoint,
    radiusM: RALLY.branchOffsetM,
    fork: slot.fork.index,
    isFork: true,
  };
}

// Distance (m) to the current slot's plane, for the fork banner + HUD.
export function distanceToSlot(route, plane) {
  const slot = currentSlot(route);
  if (!slot) return Infinity;
  const target = slot.type === 'gate' ? slot.gate.pos : slot.fork.midpoint;
  const dx = target.x - plane.pos.x;
  const dz = target.z - plane.pos.z;
  return Math.hypot(dx, dz);
}

// One frame of route logic. `framing` is the survey framing accuracy
// (0..1) for the current frame, computed by the caller from the camera.
export function updateRoute(route, plane, dt, framing) {
  const events = [];
  const slot = currentSlot(route);
  if (!slot || route.finished) return events;

  // Fork announcement: the banner goes up 600 m before the fork.
  if (slot.type === 'fork' && !route.forkAnnounced[slot.fork.index]) {
    if (distanceToSlot(route, plane) < 600) {
      route.forkAnnounced[slot.fork.index] = true;
      events.push({ type: 'fork', fork: slot.fork });
    }
  }

  // Respawn countdown: the mandatory retry fires 1.5 s after a miss,
  // or instantly on the R key (the caller sets respawnTimerSec to 0).
  if (route.pendingRespawn) {
    route.respawnTimerSec -= dt;
    if (route.respawnTimerSec <= 0) {
      const target = route.pendingRespawn;
      route.pendingRespawn = null;
      events.push({ type: 'respawn', target });
    }
    return events;
  }

  if (slot.type === 'gate') {
    const gate = slot.gate;
    if (gateHit(gate, plane.pos)) {
      events.push(...scoreGate(route, gate, plane, framing));
      route.slotIndex += 1;
    } else if (missedGate(gate, plane.pos)) {
      events.push(...missGate(route, gate, plane));
    }
    return events;
  }

  // Fork slot: either branch gate commits the fork.
  for (const gate of slot.gates) {
    if (gateHit(gate, plane.pos)) {
      commitFork(route, slot, gate);
      events.push(...scoreGate(route, gate, plane, framing));
      route.slotIndex += 1;
      return events;
    }
  }
  // Missed the whole fork: flew past both branch gates.
  const past = slot.gates.every((g) => missedGate(g, plane.pos));
  if (past) events.push(...missFork(route, slot, plane));
  return events;
}

function commitFork(route, slot, gate) {
  route.committed[slot.fork.index] = gate.branch;
  for (const other of slot.gates) {
    if (other !== gate) {
      other.active = false; // the road not taken, dimmed
      other.missed = false;
    }
  }
}

// Flown past the gate's plane (> 45 m beyond it) without a hit.
function missedGate(gate, pos) {
  const o = gateLocalOffset(gate, pos);
  return o.along > 45;
}

function scoreGate(route, gate, plane, framing) {
  const precision = gatePrecision(gate, plane.pos);
  let accuracy = precision;
  let survey = null;
  if (gate.survey) {
    survey = {
      precision,
      framing: framing ?? 0,
      accuracy: 0.8 * precision + 0.2 * (framing ?? 0),
    };
    accuracy = survey.accuracy;
    route.survey = survey;
  }
  const base = gate.kind === 'technical'
    ? SCORING.techBase + SCORING.techPerAccuracy * accuracy
    : SCORING.openBase + SCORING.openPerAccuracy * accuracy;
  const combo = accuracy >= SCORING.comboMinAccuracy
    ? SCORING.comboPerStreak * Math.min(route.streak, 5)
    : 0;
  gate.passed = true;
  gate.accuracy = accuracy;
  gate.pointsEarned = Math.round(base);
  gate.comboEarned = combo;
  if (accuracy >= SCORING.comboMinAccuracy) {
    route.streak += 1;
    route.bestStreak = Math.max(route.bestStreak, route.streak);
  } else {
    route.streak = 0;
  }
  const events = [{ type: 'gate', gate, accuracy, points: gate.pointsEarned, combo }];
  if (survey) events.push({ type: 'survey', gate, survey });
  return events;
}

function missGate(route, gate, plane) {
  route.misses += 1;
  route.streak = 0;
  const key = gate.id;
  route.retries[key] = (route.retries[key] ?? 0) + 1;
  gate.missed = true;
  const events = [{ type: 'miss', gate, retries: route.retries[key] }];
  if (route.retries[key] >= SCORING.maxRetries) {
    // Cap: two consecutive fails, the gate is skipped for 0 points.
    gate.passed = true;
    gate.accuracy = 0;
    gate.pointsEarned = 0;
    gate.comboEarned = 0;
    route.slotIndex += 1;
    events.push({ type: 'gateSkipped', gate });
  } else {
    route.pendingRespawn = { kind: 'gate', gate };
    route.respawnTimerSec = 1.5;
  }
  return events;
}

function missFork(route, slot, plane) {
  route.misses += 1;
  route.streak = 0;
  const key = `fork${slot.fork.index}`;
  route.retries[key] = (route.retries[key] ?? 0) + 1;
  const events = [{ type: 'miss', fork: slot.fork, retries: route.retries[key] }];
  if (route.retries[key] >= SCORING.maxRetries) {
    // Cap: the fork is skipped — neither branch scores.
    for (const g of slot.gates) {
      g.passed = true;
      g.accuracy = 0;
      g.pointsEarned = 0;
      g.comboEarned = 0;
      g.active = false;
    }
    route.committed[slot.fork.index] = '—';
    route.slotIndex += 1;
    events.push({ type: 'gateSkipped', fork: slot.fork });
  } else {
    route.pendingRespawn = { kind: 'fork', fork: slot.fork };
    route.respawnTimerSec = 1.5;
  }
  return events;
}

// The Safe-Approach Respawn: 150 m before the gate (or the fork
// midpoint), on the leg heading, at the gate's altitude, 65 kt.
export function respawnPose(route, target) {
  const graph = route.graph;
  const fwd = graph.forward;
  let anchor;
  let altitude;
  if (target.kind === 'gate') {
    anchor = target.gate.pos;
    altitude = target.gate.pos.y;
  } else {
    anchor = target.fork.midpoint;
    altitude = anchor.y;
  }
  return {
    pos: {
      x: anchor.x - fwd.x * SCORING.respawnDistanceM,
      y: altitude,
      z: anchor.z - fwd.z * SCORING.respawnDistanceM,
    },
    headingDeg: graph.legHeadingDeg,
    speedKt: 65,
  };
}

export function routeCode(route) {
  return routeCodeFor(route.committed);
}

export function gatesFlown(route) {
  return route.graph.gates.filter((g) => g.active && g.passed).length;
}
