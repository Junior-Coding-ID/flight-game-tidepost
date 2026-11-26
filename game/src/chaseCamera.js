// chaseCamera — the camera that never fights the pilot.
// Chase view sits behind and above the Tidewing, smoothed so the aircraft
// stays planted in the frame while the world turns around it. Touchdown
// and turbulence shake it; the pilot can pull it closer, reset it, or look
// around a little with the mouse.

import { CAMERA } from './config.js';
import { clamp, damp, headingForwardDeg, headingRightDeg } from './math3d.js';

export const CAMERA_MODES = ['chase', 'close', 'cockpit'];

export function createCamera() {
  return {
    modeIndex: 0,
    eye: { x: 0, y: 60, z: 0 },
    target: { x: 0, y: 10, z: 0 },
    shake: 0,
    freeLook: { yaw: 0, pitch: 0 },
    ready: false,
  };
}

export function cycleCameraMode(camera) {
  camera.modeIndex = (camera.modeIndex + 1) % CAMERA_MODES.length;
  return CAMERA_MODES[camera.modeIndex];
}

export function resetCamera(camera) {
  camera.freeLook = { yaw: 0, pitch: 0 };
}

export function addCameraShake(camera, amount) {
  camera.shake = Math.min(1, camera.shake + amount);
}

export function updateChaseCamera(camera, plane, dt) {
  const mode = CAMERA_MODES[camera.modeIndex];
  const fwd = headingForwardDeg(plane.headingDeg);
  const right = headingRightDeg(plane.headingDeg);

  let dist = CAMERA.chaseDistanceM;
  let height = CAMERA.chaseHeightM;
  if (mode === 'close') {
    dist = 15;
    height = 4.5;
  } else if (mode === 'cockpit') {
    dist = -2;
    height = 1.4;
  }

  // The eye trails behind the aircraft, the target looks ahead of it.
  const desiredEye = {
    x: plane.pos.x - fwd.x * dist + right.x * camera.freeLook.yaw * 2,
    y: plane.pos.y + height + camera.freeLook.pitch * 2,
    z: plane.pos.z - fwd.z * dist + right.z * camera.freeLook.yaw * 2,
  };
  const desiredTarget = {
    x: plane.pos.x + fwd.x * CAMERA.lookAheadM,
    y: plane.pos.y + plane.pitchDeg * 0.35,
    z: plane.pos.z + fwd.z * CAMERA.lookAheadM,
  };

  if (!camera.ready) {
    camera.eye = desiredEye;
    camera.target = desiredTarget;
    camera.ready = true;
  } else {
    const rate = CAMERA.smoothing;
    camera.eye = {
      x: damp(camera.eye.x, desiredEye.x, rate, dt),
      y: damp(camera.eye.y, desiredEye.y, rate, dt),
      z: damp(camera.eye.z, desiredEye.z, rate, dt),
    };
    camera.target = {
      x: damp(camera.target.x, desiredTarget.x, rate * 1.4, dt),
      y: damp(camera.target.y, desiredTarget.y, rate * 1.4, dt),
      z: damp(camera.target.z, desiredTarget.z, rate * 1.4, dt),
    };
  }

  // Shake decays; it jitters the eye a little while it lasts.
  camera.shake = Math.max(0, camera.shake - dt * 1.8);
  if (camera.shake > 0.01) {
    const s = camera.shake * camera.shake * 1.6;
    camera.eye = {
      x: camera.eye.x + (Math.random() - 0.5) * s,
      y: camera.eye.y + (Math.random() - 0.5) * s,
      z: camera.eye.z + (Math.random() - 0.5) * s,
    };
  }

  // Never let the camera sink under the terrain.
  const minY = 2;
  camera.eye.y = Math.max(camera.eye.y, minY);
  return { eye: camera.eye, target: camera.target };
}

export function cameraModeName(camera) {
  return CAMERA_MODES[camera.modeIndex];
}
