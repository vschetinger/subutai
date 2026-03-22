import type { BoardState } from '../engine/types';
import { boardFeatureVector } from './features';
import { castFromBoard } from './cast';

/**
 * Structured bottleneck (Phase 3): discrete I-Ching code + small residual.
 * Not a full VAE — explicit symbols for interpretability; residual is tiny.
 */
export interface BottleneckCode {
  readonly hexagramIndex: number;
  readonly changingMask: number;
  /** Few floats for what hex lines don’t capture. */
  readonly residual: readonly [number, number, number];
}

export function encodeBottleneck(state: BoardState): BottleneckCode {
  const cast = castFromBoard(state, state.sideToMove, null);
  const f = boardFeatureVector(state);
  return {
    hexagramIndex: cast.hexagramIndex,
    changingMask: cast.changingLines & 0x3f,
    residual: [f[0]!, f[1]!, f[2]!],
  };
}

/** Toy reconstruction: returns a copy of features with residual channels mixed in. */
export function decodeBottleneck(code: BottleneckCode, baseDim = 12): Float32Array {
  const out = new Float32Array(baseDim);
  const mix = (code.hexagramIndex % 16) / 16 - 0.5;
  for (let i = 0; i < baseDim; i++) {
    out[i] = mix * 0.1 + (i < 3 ? code.residual[i]! * 0.3 : 0);
  }
  return out;
}
