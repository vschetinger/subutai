import type { BoardState, Color, PieceType } from '../engine/types';
import { allSquares } from '../engine/board';

const PV: Record<PieceType, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
};

/**
 * Compact handcrafted features for oracle / tiny nets (not full PST).
 */
export function boardFeatureVector(state: BoardState): Float32Array {
  let mat = 0;
  let mobilityW = 0;
  let mobilityB = 0;
  for (const [sq, piece] of state.pieces) {
    const v = PV[piece.type];
    if (piece.color === 'white') mat += v;
    else mat -= v;
    const r = Number(sq[1]);
    const m = piece.type === 'pawn' ? 1 : piece.type === 'knight' ? 2 : 1;
    if (piece.color === 'white') mobilityW += m * (r - 1);
    else mobilityB += m * (8 - r);
  }
  const topoA = state.topologyState === 'A' ? 1 : 0;
  const f = new Float32Array(12);
  f[0] = mat / 8000;
  f[1] = mobilityW / 200;
  f[2] = mobilityB / 200;
  f[3] = topoA;
  f[4] = state.halfmoveClock / 100;
  f[5] = state.fullmoveNumber / 80;
  f[6] = state.sideToMove === 'white' ? 1 : -1;
  f[7] = state.pieces.size / 32;
  let occ = 0;
  for (const sq of allSquares) {
    if (state.pieces.has(sq)) occ++;
  }
  f[8] = occ / 64;
  f[9] = state.enPassantTarget ? 1 : 0;
  f[10] = 0;
  f[11] = 0;
  return f;
}

export function perspectiveFlipFeatures(
  vec: Float32Array,
  perspective: Color,
): Float32Array {
  const out = new Float32Array(vec);
  if (perspective === 'black') {
    out[0] = -out[0];
    out[1] = vec[2];
    out[2] = vec[1];
    out[6] = -out[6];
  }
  return out;
}
