// TIDEPOST: ISLAND AIRMAIL — the entrypoint (Node 22, standard library only).
// It hands the game in: copies game/ and screenshots/ from beside this file
// to /output and writes /output/dossier.json, the summary the judge reads,
// with the vendored make.fun library. No build step, no network, no
// dependencies: the game is plain static files a browser opens offline.
//
// Run it locally the way the grader does:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own caps, so a bad bundle fails here first, loudly, instead of
// silently at the scorer: at most 4 screenshots of 256 KiB, at most 993
// files / 48 MiB under game/, and no game/ path over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
