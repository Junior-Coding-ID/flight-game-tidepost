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
    id: 'R01',
    code: 'R01',
    name: 'Skyweave Rally',
    from: 'mailhaven',
    to: 'pelican',
    difficulty: 'Rally',
    cargo: { label: 'Survey mail', sensitivity: 0.75 },
    parSec: 120,
    capSec: 180,
    fuel: 100,
    medals: { bronze: 1400, silver: 1800, gold: 2050 },
    briefing:
      'One rally, twelve checkpoints, three forks. Fly the shared gates, then choose at every fork: the wide Open ring is safe, the narrow Technical octagon pays more if you fly it clean. At the last fork, frame the Pelican Bay lighthouse as you pass the survey gate. Miss a gate and you go back 150 m and try again.',
    tips: 'Open pays 100-200, Technical pays 18-218 — Technical only wins above 82% accuracy. Chain clean gates for combo.',
  },
];

export const SCORING = {
  // SKYWEAVE+ rally scoring (FINAL LOCK v2, corrected).
  // Open gate: 100 + 100a. Technical gate: 18 + 200a. Breakeven 82%.
  // Combo: +10 per prior clean gate in the streak (max +50) when a >= 80%.
  // Miss: -40, mandatory retry; after 2 consecutive fails the gate is
  // skipped for 0 points (-80 total). No finish bonus.
  openBase: 100,
  openPerAccuracy: 100,
  techBase: 18,
  techPerAccuracy: 200,
  breakevenAccuracy: 0.82,
  comboPerStreak: 10,
  comboMax: 50,
  comboMinAccuracy: 0.8,
  missPenalty: 40,
  maxRetries: 2,
  respawnDistanceM: 150,
};

// Route + gate geometry for the rally (FINAL LOCK v2).
export const RALLY = {
  gatesDefined: 12,
  gatesFlown: 9,
  forks: 3,
  openColor: '#4DE2E6',
  techColor: '#FFC247',
  openDiameterM: 44,
  openRadiusM: 22,
  techHalfWM: 13,
  techHalfHM: 16,
  surveyForkIndex: 2,
  surveyLandmarkId: 'lighthouse-pelican',
  framingMaxErrorDeg: 25,
  branchOffsetM: 280,
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
