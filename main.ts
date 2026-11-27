// main — TIDEPOST: SKYWEAVE+ (best flight game, v2).
// Node 22, standard library only, erasable TypeScript. No arguments:
// it reads nothing from the command line, tolerates a missing /input,
// and writes the entry into the output directory.
//
// Output directory, in order: MAKEFUN_OUTPUT_DIR, MAKEFUN_OUTPUT,
// "/output". The output directory itself is never removed; only its
// contents are cleared, one child at a time.
//
// It copies game/ and screenshots/ beside it into the output directory
// and writes entry.txt, the entry's text: the game's name, its idea in
// one line, and how to play it. The dossier (dossier.json) is written
// by the second half of this file, from vendor/makefun-game.ts.

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const ENTRY_TEXT = `TIDEPOST: SKYWEAVE+ — Branching Air Rally & Landmark Survey

One rally, twelve checkpoints, three forks. Fly the Tidewing bush plane
from Mailhaven to Pelican Bay through six shared gates, and at each of
three forks choose: the wide Open ring (cyan, 100-200 points) or the
narrow Technical octagon (amber, 18-218 points). Technical only wins
above 82% accuracy. At the last fork, frame the Pelican Bay lighthouse
as you pass the survey gate: accuracy A = 0.8P + 0.2F. Chain clean gates
for combo (+10 per prior clean gate, max +50). Miss a gate: -40 and a
mandatory retry 150 m before it; two fails skip it for 0 points.
Eight routes (OOO-TTT), 90-150 seconds a run, no finish bonus.

Play: W/S pitch, A/D roll, Q/E rudder, I/K throttle, F flaps, B brake,
C camera, M map, R respawn after a miss (hold R to restart), Esc pause.
Keyboard and mouse, desktop Chrome, no network.
`;

function outputDir() {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR || process.env.MAKEFUN_OUTPUT;
  return fromEnv ? resolve(fromEnv) : '/output';
}

function repoDir() {
  // The repository root is the directory holding this script: argv[1] is
  // the script's own path, never a caller-supplied argument.
  return dirname(resolve(process.argv[1]));
}

function clearContents(dir) {
  // Only the children go: the directory itself is never removed.
  if (!existsSync(dir)) return;
  for (const child of readdirSync(dir)) {
    rmSync(join(dir, child), { recursive: true, force: true });
  }
}

function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const child of readdirSync(src)) {
    const from = join(src, child);
    const to = join(dest, child);
    if (statSync(from).isDirectory()) copyTree(from, to);
    else copyFileSync(from, to);
  }
}

function main() {
  const out = outputDir();
  const root = repoDir();
  mkdirSync(out, { recursive: true });
  clearContents(out);
  const gameDir = join(root, 'game');
  const shotsDir = join(root, 'screenshots');
  if (!existsSync(gameDir)) throw new Error('game/: no such directory beside main.ts');
  copyTree(gameDir, join(out, 'game'));
  if (existsSync(shotsDir)) copyTree(shotsDir, join(out, 'screenshots'));
  writeFileSync(join(out, 'entry.txt'), ENTRY_TEXT, 'utf8');
  // This entry needs no input: a missing /input is normal, and a
  // present one is left alone.
  // The dossier: the scorer runs this same file, byte for byte, on what
  // is handed in, so the dossier written here must be the one it writes.
  const dossier = buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(out, 'dossier.json'), dossier);
  return {
    out,
    entryBytes: Buffer.byteLength(ENTRY_TEXT, 'utf8'),
    dossierBytes: dossier.length,
  };
}

const result = main();
console.log(`tidepost-skyweave: wrote ${result.out} (entry.txt ${result.entryBytes} bytes, dossier.json ${result.dossierBytes} bytes)`);
