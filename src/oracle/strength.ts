import { TRIGRAM_TAGS } from './trigrams';

export interface ArchetypeScores {
  /** Aggressive / creative pressure. */
  readonly force: number;
  readonly receptivity: number;
  readonly danger: number;
  readonly clarity: number;
  /** How much the situation is in flux (changing lines). */
  readonly transition: number;
}

function popcount6(n: number): number {
  let c = 0;
  for (let i = 0; i < 6; i++) if ((n >> i) & 1) c++;
  return c;
}

/**
 * Lower/upper trigram indices 0–7 (binary bagua order).
 * Uses a simple 8×8 grid from hexagram index for a stable hand-tuned mapping.
 */
export function trigramsFromHexagramIndex(hexagramIndex: number): [number, number] {
  const lower = hexagramIndex & 7;
  const upper = (hexagramIndex >> 3) & 7;
  return [lower, upper];
}

/**
 * Explicit I-Ching-flavored archetype scores (long-term wisdom layer).
 * Not centipawns — normalized roughly to [-1, 1] per dimension.
 */
export function g(
  hexagramIndex: number,
  changingLinesMask: number,
): ArchetypeScores {
  const [lower, upper] = trigramsFromHexagramIndex(hexagramIndex);
  const tl = TRIGRAM_TAGS[lower]!;
  const tu = TRIGRAM_TAGS[upper]!;
  const transition = popcount6(changingLinesMask & 0x3f) / 6;
  return {
    force: (tl.force + tu.force) / 2,
    receptivity: (tl.receptivity + tu.receptivity) / 2,
    danger: (tl.danger + tu.danger) / 2,
    clarity: (tl.clarity + tu.clarity) / 2,
    transition,
  };
}
