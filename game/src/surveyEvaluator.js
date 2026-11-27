// surveyEvaluator — the Landmark Survey at the third fork.
// Flying a survey gate is only half the job: the pilot must also frame
// the Pelican Bay lighthouse in view as they pass it. Framing F is 1
// with the lighthouse dead centre and 0 once it is 25 degrees off the
// view direction. The gate's effective accuracy is A = 0.8P + 0.2F,
// where P is the pass precision through the ring itself: the survey
// rewards looking, but it never outranks flying the gate clean.

import { clamp } from './math3d.js';
import { RALLY } from './config.js';
import { LANDMARKS } from './world.js';

export function lighthousePosition() {
  const mark = LANDMARKS.find((l) => l.id === RALLY.surveyLandmarkId);
  return mark ? mark.pos : { x: 2450, y: 10, z: -1150 };
}

// F from the angle between the view direction and the lighthouse.
// viewDir is a unit {x, y, z}; fromPos is where the camera sits.
export function framingAccuracy(viewDir, fromPos, landmarkPos = lighthousePosition()) {
  const dx = landmarkPos.x - fromPos.x;
  const dy = landmarkPos.y + 14 - fromPos.y; // aim at the lamp room, not the base
  const dz = landmarkPos.z - fromPos.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  const dot = (dx * viewDir.x + dy * viewDir.y + dz * viewDir.z) / len;
  const angleDeg = Math.acos(clamp(dot, -1, 1)) * (180 / Math.PI);
  return clamp(1 - angleDeg / RALLY.framingMaxErrorDeg, 0, 1);
}

// Effective survey accuracy: precision counts four times as much as
// framing, so a framed but sloppy pass never beats a clean blind one.
export function surveyAccuracy(precision, framing) {
  return 0.8 * clamp(precision, 0, 1) + 0.2 * clamp(framing, 0, 1);
}
