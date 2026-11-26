// TIDEPOST: ISLAND AIRMAIL — shared tuning, world layout and mission data.
// Every number the physics, renderer and scoring agree on lives here, so a
// single edit re-tunes the whole game instead of chasing magic numbers.

export const WORLD = {
  sizeM: 8000,
  halfM: 4000,
  seaLevelM: 0,
  // Golden-hour sun: low from the west, warm on every flat-shaded face.
  sunDir: { x: -0.55, y: 0.62, z: -0.35 },
};

export const COLORS = {
  skyTop: '#2e5f8a',
  skyMid: '#7fb0c9',
  skyHorizon: '#f2c078',
  seaDeep: '#173b52',
  seaShallow: '#35b6ac',
  sand: '#e8d9b3',
  grass: '#7fae62',
  rock: '#8a7f74',
  cliff: '#6e5f52',
  runway: '#3c4148',
  runwayLine: '#f5f0dc',
  planeCream: '#e8d9b3',
  planeOrange: '#e78038',
  planeDark: '#4a3f35',
  hangar: '#b8542e',
  lighthouse: '#f2ede0',
  lighthouseTop: '#c0392b',
  tower: '#d8d2c4',
  cloud: '#fdf6e8',
};

export const FLIGHT = {
  stallCleanKt: 42,
  stallFlapKt: 34,
  cruiseKt: 75,
  maxNominalKt: 100,
  hardCapKt: 110,
  rotateKt: 55,
  pitchMinDeg: -18,
  pitchMaxDeg: 20,
  bankMaxDeg: 50,
  pitchRateDegS: 16,
  rollRateDegS: 55,
  yawRateDegS: 12,
  climbMaxFpm: 1000,
  descentMaxFpm: -1200,
  // Stall: the vertical-speed ceiling sinks with severity, -600 .. -1500 fpm.
  stallSinkMinFpm: -600,
  stallSinkMaxFpm: -1500,
  // Ground handling (brief section "Ground pitch 0-12 deg / 25 deg/s").
  groundPitchMaxDeg: 12,
  groundPitchRateDegS: 25,
  brakeDecelKtS: 22,
  rollingDragKtS: 1.6,
};

// Runways: headingDeg is the landing/takeoff direction (0 = north = -Z,
// 90 = east = +X). Elevation is the flattened terrain height at the strip.
export const RUNWAYS = {
  mailhaven: {
    id: 'mailhaven',
    name: 'Mailhaven',
    center: { x: -2400, z: -1800 },
    headingDeg: 300,
    lengthM: 700,
    widthM: 26,
    elevationM: 6,
  },
  pelican: {
    id: 'pelican',
    name: 'Pelican Bay',
    center: { x: 2200, z: -1400 },
    headingDeg: 140,
    lengthM: 640,
    widthM: 24,
    elevationM: 10,
  },
  cloudreach: {
    id: 'cloudreach',
    name: 'Cloudreach',
    center: { x: 0, z: 2400 },
    headingDeg: 150,
    lengthM: 680,
    widthM: 24,
    elevationM: 130,
  },
};

// Island silhouettes the terrain generator raises out of the sea.
export const ISLANDS = [
  { id: 'mailhaven', center: { x: -2400, z: -1800 }, radiusM: 1500, peakM: 62 },
  { id: 'pelican', center: { x: 2200, z: -1400 }, radiusM: 1300, peakM: 48 },
  { id: 'cloudreach', center: { x: 0, z: 2400 }, radiusM: 1600, peakM: 165 },
];

export const MISSIONS = [
  {
    id: 'M01',
    code: 'M01',
    name: 'First Post',
    from: 'mailhaven',
    to: 'pelican',
    difficulty: 'Easy',
    cargo: { label: 'Mail sacks', sensitivity: 0.75 },
    parSec: 110,
    capSec: 155,
    fuel: 100,
    medals: { bronze: 450, silver: 700, gold: 850 },
    briefing:
      'First run of the day. Lift the mail sacks out of Mailhaven, cross the bay, and set the Tidewing down gently on Pelican Bay. Smooth beats fast.',
    tips: 'Rotate near 55 kt. Keep the glide slope needle centred on final.',
  },
  {
    id: 'M02',
    code: 'M02',
    name: 'Fragile Cargo',
    from: 'pelican',
    to: 'cloudreach',
    difficulty: 'Medium',
    cargo: { label: 'Ceramics', sensitivity: 1.4 },
    parSec: 130,
    capSec: 175,
    fuel: 88,
    medals: { bronze: 480, silver: 720, gold: 860 },
    briefing:
      'A crate of island ceramics for the weather station on Cloudreach. The cargo hates hard landings, the cliff runway sits 130 m up, and fuel is tight. Fly like the plates are yours.',
    tips: 'Climb early — Cloudreach is high. Flaps down early, throttle gentle.',
  },
  {
    id: 'M03',
    code: 'M03',
    name: 'Last Light Express',
    from: 'cloudreach',
    to: 'mailhaven',
    difficulty: 'Hard',
    cargo: { label: 'Priority mail', sensitivity: 1.0 },
    parSec: 145,
    capSec: 190,
    fuel: 92,
    medals: { bronze: 500, silver: 740, gold: 870 },
    briefing:
      'Last light, last flight. Priority mail from the high station back to Mailhaven before the sun drops into the sea. Longest leg, lowest sun, no excuses.',
    tips: 'Use the full runway. Trade a little altitude for speed on the way down.',
  },
];

export const SCORING = {
  maxTotal: 1000,
  cargo: 350,
  landing: 350,
  time: 200,
  gateEach: 50,
  landingPoints: { perfect: 350, good: 300, hard: 180, crash: 0 },
  // Hard-landing cargo penalties (the x0.65 hard-landing multiplier is gone).
  hardLandingCargoPenalty: 8,
  veryHardLandingCargoPenalty: 12,
};

export const GATES = {
  approachRadiusM: 22,
  routeRadiusM: 60,
  approachDistanceM: 380,
  glideSlope: 0.065,
  routeGateAltitudeM: 260,
};

export const CONTROLS = {
  pitchUp: 'KeyW',
  pitchDown: 'KeyS',
  rollLeft: 'KeyA',
  rollRight: 'KeyD',
  yawLeft: 'KeyQ',
  yawRight: 'KeyE',
  throttleUp: 'KeyI',
  throttleDown: 'KeyK',
  flaps: 'KeyF',
  brake: 'KeyB',
  brakeAlt: 'Space',
  camera: 'KeyC',
  cameraReset: 'KeyV',
  minimap: 'KeyM',
  pause: 'Escape',
  pauseAlt: 'KeyP',
  restart: 'KeyR',
  help: 'KeyH',
};

export const CAMERA = {
  chaseDistanceM: 26,
  chaseHeightM: 7,
  lookAheadM: 60,
  smoothing: 6.5,
};

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) ?? MISSIONS[0];
}

export function runwayById(id) {
  return RUNWAYS[id];
}
