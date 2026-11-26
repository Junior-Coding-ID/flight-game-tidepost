// audio — every sound is synthesized with WebAudio: an engine hum that
// follows the throttle, wind that follows the airspeed, and short blips
// for gates, touchdowns and deliveries. No audio files, no network.

export function createAudio() {
  return {
    ctx: null,
    engineOsc: null,
    engineGain: null,
    windSource: null,
    windGain: null,
    windFilter: null,
    muted: false,
  };
}

function ensureContext(audio) {
  if (audio.ctx) return audio.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  audio.ctx = ctx;

  // Engine: two detuned saws through a low-pass, gain follows throttle.
  audio.engineOsc = ctx.createOscillator();
  audio.engineOsc.type = 'sawtooth';
  audio.engineOsc.frequency.value = 55;
  const engineOsc2 = ctx.createOscillator();
  engineOsc2.type = 'sawtooth';
  engineOsc2.frequency.value = 55 * 1.01;
  audio.engineGain = ctx.createGain();
  audio.engineGain.gain.value = 0;
  const engineFilter = ctx.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 320;
  audio.engineOsc.connect(engineFilter);
  engineOsc2.connect(engineFilter);
  engineFilter.connect(audio.engineGain);
  audio.engineGain.connect(ctx.destination);
  audio.engineOsc.start();
  engineOsc2.start();
  audio.engineOsc2 = engineOsc2;

  // Wind: looped noise through a band-pass, gain follows airspeed.
  const len = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  audio.windSource = ctx.createBufferSource();
  audio.windSource.buffer = buffer;
  audio.windSource.loop = true;
  audio.windFilter = ctx.createBiquadFilter();
  audio.windFilter.type = 'bandpass';
  audio.windFilter.frequency.value = 500;
  audio.windGain = ctx.createGain();
  audio.windGain.gain.value = 0;
  audio.windSource.connect(audio.windFilter);
  audio.windFilter.connect(audio.windGain);
  audio.windGain.connect(ctx.destination);
  audio.windSource.start();
  return ctx;
}

export function resumeAudio(audio) {
  const ctx = ensureContext(audio);
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

// Called every frame while flying: hum and wind track the aircraft.
export function updateAudio(audio, plane, dt) {
  if (!audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime;
  const throttle = plane.throttle;
  const speed = plane.speedKt;
  audio.engineOsc.frequency.setTargetAtTime(48 + throttle * 70, t, 0.1);
  audio.engineOsc2.frequency.setTargetAtTime((48 + throttle * 70) * 1.01, t, 0.1);
  audio.engineGain.gain.setTargetAtTime(plane.onGround ? throttle * 0.05 : 0.02 + throttle * 0.05, t, 0.1);
  audio.windFilter.frequency.setTargetAtTime(300 + speed * 9, t, 0.15);
  audio.windGain.gain.setTargetAtTime(plane.airborne ? Math.min(0.09, speed * 0.0009) : 0, t, 0.2);
}

function blip(audio, freq, durSec, type, gainVal, whenSec = 0) {
  if (!audio.ctx || audio.muted) return;
  const ctx = audio.ctx;
  const t = ctx.currentTime + whenSec;
  const osc = ctx.createOscillator();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(gainVal, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + durSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + durSec + 0.05);
}

export function playGateChime(audio) {
  blip(audio, 880, 0.18, 'sine', 0.18);
  blip(audio, 1318, 0.3, 'sine', 0.15, 0.09);
}

export function playTouchdown(audio, hard) {
  blip(audio, hard ? 90 : 140, 0.25, 'triangle', 0.3);
  if (!hard) blip(audio, 660, 0.2, 'sine', 0.12, 0.05);
}

export function playDeliveryFanfare(audio) {
  const notes = [523, 659, 784, 1046];
  notes.forEach((f, i) => blip(audio, f, 0.35, 'sine', 0.16, i * 0.12));
}

export function playCrash(audio) {
  blip(audio, 70, 0.7, 'sawtooth', 0.25);
  blip(audio, 45, 0.9, 'triangle', 0.3, 0.05);
}

export function playClick(audio) {
  blip(audio, 1200, 0.06, 'sine', 0.1);
}
