// cargoCondition — the cargo's health, 100 down to 0.
// Turbulence comes from flying rough: hard banks at speed, steep dives and
// stall buffets shake the load. The touchdown itself is judged separately
// by the landing evaluator; this module prices the flight there.
//
// The mission's sensitivity multiplies every shake (M02 ceramics at 1.4x
// feel every bump; M01 mail sacks at 0.75x forgive them).

import { clamp } from './math3d.js';

export function createCargo(sensitivity) {
  return { health: 100, sensitivity };
}

// Called every frame while airborne. Returns the damage taken this frame.
export function updateCargoCondition(cargo, plane, dt) {
  if (!plane.airborne) return 0;
  let shake = 0;
  // Only the rough stuff shakes the load: steep banks past 32 degrees,
  // pitch past 16 (a normal climb or descent is free), stall buffet and
  // a hard sink on final. A well-flown leg loses a few percent at most.
  const bankLoad = Math.max(0, Math.abs(plane.bankDeg) - 32) / 18;
  shake += bankLoad * (plane.speedKt / 100) * 0.35;
  const pitchLoad = Math.max(0, Math.abs(plane.pitchDeg) - 16) / 4;
  shake += pitchLoad * 0.25;
  // Stall buffet: the whole airframe shudders.
  if (plane.speedKt < 45) shake += (45 - plane.speedKt) * 0.06;
  // A hard sink rate on final is rough on the crate even before touchdown.
  if (plane.vsFpm < -900) shake += (-plane.vsFpm - 900) / 800;
  const damage = shake * cargo.sensitivity * dt;
  cargo.health = clamp(cargo.health - damage, 0, 100);
  return damage;
}

// The touchdown's own price, applied once by the mission controller.
export function applyTouchdownCargoDamage(cargo, landingKind, vsFpm) {
  let penalty = 0;
  if (landingKind === 'hard') {
    penalty = Math.abs(vsFpm) > 500 ? 12 : 8;
  } else if (landingKind === 'crash') {
    penalty = 45;
  }
  cargo.health = clamp(cargo.health - penalty * cargo.sensitivity, 0, 100);
  return penalty;
}

export function cargoLabel(cargo) {
  if (cargo.health >= 90) return 'PRISTINE';
  if (cargo.health >= 70) return 'GOOD';
  if (cargo.health >= 45) return 'SHAKEN';
  if (cargo.health >= 20) return 'DAMAGED';
  return 'RUINED';
}
