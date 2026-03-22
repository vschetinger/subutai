import type { BoardState, SquareId } from '../engine/types';
import { castFromBoard } from './cast';
import { g } from './strength';
import { boardFeatureVector } from './features';
import { tinyMlpScore } from './head';
import { MAX_ORACLE_CENTIPAWNS } from './config';

/**
 * Scalar bias in centipawns for search (side to move). Bounded by MAX_ORACLE_CENTIPAWNS.
 */
export function oracleTacticalBias(
  state: BoardState,
  lastMove?: { from?: SquareId; to?: SquareId } | null,
): number {
  const cast = castFromBoard(state, state.sideToMove, lastMove);
  const arch = g(cast.hexagramIndex, cast.changingLines);
  const archetypePart =
    (arch.force - arch.receptivity) * 12 +
    (arch.danger - arch.clarity) * 8 +
    (arch.transition - 0.5) * 20;

  const fv = boardFeatureVector(state);
  const mlp = tinyMlpScore(fv);

  const raw = archetypePart * 0.6 + mlp * 40;
  const clamped = Math.max(-MAX_ORACLE_CENTIPAWNS, Math.min(MAX_ORACLE_CENTIPAWNS, raw));
  return clamped;
}
