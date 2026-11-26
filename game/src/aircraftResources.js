// aircraftResources — fuel and airframe damage, the two numbers that turn
// a sortie into decisions. Fuel burns with throttle; damage comes from
// rough ground, hard touchdowns and running out of sky. Empty fuel means
// the engine quits and the aircraft becomes a glider.

import { clamp } from './math3d.js';

export function createResources(fuel) {
  return { fuel, damage: 0, engineOut: false };
}

// Fuel burn per second: a base idle burn plus throttle work.
export function updateFuel(resources, plane, dt) {
  if (resources.engineOut) return;
  const burn = (0.12 + plane.throttle * 0.42) * dt;
  resources.fuel = Math.max(0, resources.fuel - burn);
  if (resources.fuel <= 0) {
    resources.fuel = 0;
    resources.engineOut = true;
    plane.throttle = 0;
  }
}

// Throttle is dead with the engine out; the propeller windmills.
export function effectiveThrottle(resources, plane) {
  return resources.engineOut ? 0 : plane.throttle;
}

export function applyDamage(resources, amount, reason) {
  resources.damage = clamp(resources.damage + amount, 0, 100);
  return { damage: resources.damage, reason };
}

export function fuelLabel(resources) {
  if (resources.engineOut) return 'EMPTY';
  if (resources.fuel < 15) return 'LOW';
  if (resources.fuel < 35) return 'CAUTION';
  return 'OK';
}

export function isAirworthy(resources) {
  return resources.damage < 100 && !resources.engineOut;
}
