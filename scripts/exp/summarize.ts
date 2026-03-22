/**
 * Aggregate JSONL shards: npx tsx scripts/exp/summarize.ts path/to/shard.jsonl
 */
import { readFileSync, existsSync } from 'node:fs';

const target = process.argv[2];
if (!target || !existsSync(target)) {
  console.error('Usage: npx tsx scripts/exp/summarize.ts <shard.jsonl>');
  process.exit(1);
}

const text = readFileSync(target, 'utf-8');
const lines = text.split('\n').filter((l) => l.trim().length > 0);

const byResult: Record<string, number> = {};
const byConfig: Record<string, { n: number; wins_white: number }> = {};
let pliesSum = 0;

for (const line of lines) {
  try {
    const row = JSON.parse(line) as {
      metrics?: { result?: string; plies?: number };
      game?: { config960?: string };
    };
    const r = row.metrics?.result ?? 'unknown';
    byResult[r] = (byResult[r] ?? 0) + 1;
    pliesSum += row.metrics?.plies ?? 0;
    const cfg = row.game?.config960 ?? '?';
    if (!byConfig[cfg]) byConfig[cfg] = { n: 0, wins_white: 0 };
    byConfig[cfg].n++;
    if (r === 'white_win') byConfig[cfg].wins_white++;
  } catch {
    // skip bad line
  }
}

console.log(
  JSON.stringify(
    {
      file: target,
      count: lines.length,
      byResult,
      meanPlies: lines.length ? pliesSum / lines.length : 0,
      byConfig,
    },
    null,
    2,
  ),
);
