/**
 * Offline self-play: append JSONL samples.
 * Run: npx tsx scripts/exp/run-self-play.ts --games=5
 */
import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createStartingPosition } from '../../src/engine/index.ts';
import { applyMove, isCheckmate, isStalemate } from '../../src/engine/moves.ts';
import { toggleTopology } from '../../src/engine/auxetic.ts';
import type { BoardState } from '../../src/engine/types.ts';
import { iterativeDeepen } from '../../src/ai/search.ts';
import { SCHEMA_VERSION, type ExpSample } from './schema.ts';
import { getGitMeta } from './git-meta.ts';

const runId = randomUUID();
const outDir = join(process.cwd(), 'data', 'shards');
const shardPath = join(outDir, `run-${runId.slice(0, 8)}.jsonl`);
const runJsonPath = join(outDir, `run-${runId.slice(0, 8)}.json`);

const argGames = process.argv.find((a) => a.startsWith('--games='));
const games = Math.max(
  1,
  Number(argGames?.split('=')[1] ?? process.env.GAMES ?? '5'),
);
/** Keep default modest so batch runs finish in reasonable wall time (raise MAX_PLIES for deep games). */
const maxPlies = Math.max(20, Number(process.env.MAX_PLIES ?? '80'));
const searchMs = Number(process.env.SEARCH_MS ?? '120');

function fmtDur(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(0);
  return `${m}m ${s}s`;
}

function backRankKey(state: BoardState): string {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const abbrev: Record<string, string> = {
    rook: 'R',
    knight: 'N',
    bishop: 'B',
    queen: 'Q',
    king: 'K',
  };
  return files
    .map((f) => {
      const p = state.pieces.get(`${f}1` as import('../../src/engine/types.ts').SquareId);
      return p ? abbrev[p.type] ?? '?' : '?';
    })
    .join('');
}

function playOneGame(seed: number): { result: string; plies: number } {
  let state: BoardState = createStartingPosition(seed);
  let plies = 0;
  let lastRot = false;

  while (plies < maxPlies) {
    if (isCheckmate(state, lastRot)) {
      const winner = state.sideToMove === 'white' ? 'black' : 'white';
      return { result: winner === 'white' ? 'white_win' : 'black_win', plies };
    }
    if (isStalemate(state, lastRot)) {
      return { result: 'draw_stalemate', plies };
    }

    const move = iterativeDeepen(state, searchMs, lastRot);
    if (!move) {
      return { result: 'no_move', plies };
    }

    state =
      move.kind === 'topologyToggle' ? toggleTopology(state) : applyMove(state, move);
    lastRot = move.kind === 'topologyToggle';
    plies++;

    if (isCheckmate(state, lastRot)) {
      const winner = state.sideToMove === 'white' ? 'black' : 'white';
      return { result: winner === 'white' ? 'white_win' : 'black_win', plies };
    }
    if (isStalemate(state, lastRot)) {
      return { result: 'draw_stalemate', plies };
    }
  }

  return { result: 'unfinished', plies };
}

mkdirSync(outDir, { recursive: true });

const git = getGitMeta();
const startedAt = new Date().toISOString();
const t0 = performance.now();

console.log('');
console.log('[exp] self-play  |  games=%d  max_plies=%d  search_ms=%d  shard=%s',
  games,
  maxPlies,
  searchMs,
  shardPath,
);
console.log('[exp] started %s\n', startedAt);

const byResult: Record<string, number> = {};
let seq = 0;
let sumPlies = 0;

for (let g = 0; g < games; g++) {
  const seed = Date.now() + g * 9973;
  const gameT0 = performance.now();
  const { result, plies } = playOneGame(seed);
  const gameMs = performance.now() - gameT0;
  const initial = createStartingPosition(seed);
  const config960 = backRankKey(initial);

  byResult[result] = (byResult[result] ?? 0) + 1;
  sumPlies += plies;

  const elapsed = performance.now() - t0;
  const done = g + 1;
  const meanPlies = (sumPlies / done).toFixed(1);
  const parts = Object.entries(byResult)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(' ');

  process.stdout.write(
    `[exp] ${done}/${games}  ${fmtDur(elapsed)} elapsed  game ${fmtDur(gameMs)}  ` +
      `${config960}  → ${result} (${plies} plies)  |  mean_plies=${meanPlies}  { ${parts} }\n`,
  );
  const sample: ExpSample = {
    schema_version: SCHEMA_VERSION,
    sample_id: randomUUID(),
    seq: seq++,
    run_id: runId,
    created_at: new Date().toISOString(),
    producer: {
      name: 'run-self-play',
      machine: process.env.HOSTNAME,
    },
    code: git,
    engine: {
      package_version: 'subutai@local',
      eval: 'evaluate@v1',
      search_depth_budget_ms: searchMs,
    },
    game: {
      config960,
      seed,
      topology_initial: 'A',
    },
    trial: {
      type: 'self_play',
      params: { game_index: g, max_plies: maxPlies },
    },
    metrics: {
      result,
      plies,
    },
  };
  appendFileSync(shardPath, JSON.stringify(sample) + '\n', 'utf-8');
}

const endedAt = new Date().toISOString();
writeFileSync(
  runJsonPath,
  JSON.stringify(
    {
      run_id: runId,
      schema_version: SCHEMA_VERSION,
      started_at: startedAt,
      ended_at: endedAt,
      games,
      shard: shardPath,
      command_line: process.argv.join(' '),
      git,
      tags: ['self-play', 'monte-carlo-v1'],
    },
    null,
    2,
  ),
  'utf-8',
);

const totalMs = performance.now() - t0;
console.log('');
console.log('[exp] done in %s  |  mean_plies=%s  |  outcomes: %s',
  fmtDur(totalMs),
  (sumPlies / games).toFixed(1),
  Object.entries(byResult)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(', ') || '(none)',
);
console.log('[exp] Wrote', shardPath);
console.log('[exp] Manifest', runJsonPath);
