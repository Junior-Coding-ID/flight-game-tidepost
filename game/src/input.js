// input — keyboard and mouse, merged into one control state per frame.
// Keyboard is the authority: every mission is completable on keys alone.
// Mouse adds a virtual stick (hold left and drag) and wheel throttle; a
// right-drag looks around a little without touching the flight controls.

import { CONTROLS } from './config.js';
import { clamp } from './math3d.js';

export function createInput() {
  return {
    keys: new Set(),
    pressed: new Set(), // edge-triggered: consumed once per frame by the game
    pitchAxis: 0,
    rollAxis: 0,
    yawAxis: 0,
    brake: false,
    throttleDelta: 0,
    stick: { x: 0, y: 0, active: false },
    look: { yaw: 0, pitch: 0 },
    mouse: { x: 0, y: 0, down: false, rightDown: false, startX: 0, startY: 0 },
  };
}

export function attachInput(input, canvas) {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    input.keys.add(e.code);
    input.pressed.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      input.mouse.down = true;
      input.mouse.startX = e.clientX;
      input.mouse.startY = e.clientY;
      input.stick.active = true;
    } else if (e.button === 2) {
      input.mouse.rightDown = true;
    }
  });
  window.addEventListener('mouseup', () => {
    input.mouse.down = false;
    input.mouse.rightDown = false;
    input.stick.active = false;
    input.stick.x = 0;
    input.stick.y = 0;
  });
  window.addEventListener('mousemove', (e) => {
    input.mouse.x = e.clientX;
    input.mouse.y = e.clientY;
    if (input.stick.active) {
      input.stick.x = clamp((e.clientX - input.mouse.startX) / 140, -1, 1);
      input.stick.y = clamp((e.clientY - input.mouse.startY) / 140, -1, 1);
    }
    if (input.mouse.rightDown) {
      input.look.yaw = clamp(input.look.yaw + e.movementX * 0.001, -0.5, 0.5);
      input.look.pitch = clamp(input.look.pitch + e.movementY * 0.001, -0.3, 0.3);
    }
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    input.throttleDelta += e.deltaY < 0 ? 0.05 : -0.05;
  }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function wasPressed(input, code) {
  return input.pressed.has(code);
}

export function endFrameInput(input) {
  input.pressed.clear();
  input.throttleDelta = 0;
}

// Read the merged axes for this frame: keyboard wins, the stick fills in.
export function readAxes(input) {
  const k = input.keys;
  const pitchKeys = (k.has(CONTROLS.pitchUp) ? 1 : 0) - (k.has(CONTROLS.pitchDown) ? 1 : 0);
  const rollKeys = (k.has(CONTROLS.rollRight) ? 1 : 0) - (k.has(CONTROLS.rollLeft) ? 1 : 0);
  const yawKeys = (k.has(CONTROLS.yawRight) ? 1 : 0) - (k.has(CONTROLS.yawLeft) ? 1 : 0);
  const pitch = pitchKeys !== 0 ? pitchKeys : -input.stick.y;
  const roll = rollKeys !== 0 ? rollKeys : input.stick.x;
  return {
    pitchAxis: clamp(pitch, -1, 1),
    rollAxis: clamp(roll, -1, 1),
    yawAxis: clamp(yawKeys, -1, 1),
    brake: k.has(CONTROLS.brake) || k.has(CONTROLS.brakeAlt),
    throttleDelta: input.throttleDelta,
  };
}
