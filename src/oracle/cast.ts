import type { BoardState, Color, SquareId } from '../engine/types';
import { allSquares } from '../engine/board';

export interface IChingCast {
  /** 0–63 (King Wen order index for text lookup). */
  readonly hexagramIndex: number;
  /** Six bits: line 1 (bottom) = bit 0 … line 6 = bit 5. */
  readonly changingLines: number;
}

/**
 * Deterministic cast from board + perspective + optional last move.
 * Uses a stable string key and FNV-1a-ish mixing (fast, no async crypto).
 */
export function hashBoardKey(
  state: BoardState,
  perspective: Color,
  lastMove?: { from?: SquareId; to?: SquareId } | null,
): string {
  const parts: string[] = [state.topologyState, state.sideToMove, perspective];
  for (const sq of allSquares) {
    const p = state.pieces.get(sq);
    parts.push(p ? `${p.color[0]}${p.type[0]}` : '--');
  }
  if (lastMove?.from && lastMove?.to) {
    parts.push(`${lastMove.from}>${lastMove.to}`);
  }
  return parts.join('|');
}

function mix32(seed: number, x: number): number {
  let h = seed ^ x;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

export function hashStringToUint32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function castFromBoard(
  state: BoardState,
  perspective: Color,
  lastMove?: { from?: SquareId; to?: SquareId } | null,
): IChingCast {
  const key = hashBoardKey(state, perspective, lastMove);
  const h = hashStringToUint32(key);
  const hexagramIndex = h % 64;
  const changingLines = mix32(h, 0x9e3779b9) & 0x3f;
  return { hexagramIndex, changingLines };
}
