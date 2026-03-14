import type { BoardState } from './types';
import { chess960BackRank, chess960FromBackRankKey } from './variants/chess960';

export function createStartingPosition(seed: number): BoardState {
  const base = chess960BackRank(seed);
  return {
    ...base,
    topologyState: 'A',
  };
}

export function createPositionFromBackRankKey(key: string): BoardState {
  const base = chess960FromBackRankKey(key);
  return { ...base, topologyState: 'A' as const };
}

export { isValidChess960Key } from './variants/chess960';
export * from './types';
export * from './board';
