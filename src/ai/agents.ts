import type { BoardState, Move } from '../engine';
import { generateLegalMoves } from '../engine/moves';
import { iterativeDeepen } from './search';

export interface AgentContext {
  readonly seed?: number;
  /** If true, the agent must not play a topology toggle (no two rotations in a row). */
  readonly lastMoveWasRotation?: boolean;
}

export interface Agent {
  readonly id: string;
  readonly name: string;
  chooseMove: (
    state: BoardState,
    legalMoves: readonly Move[],
    context?: AgentContext,
  ) => Promise<Move | null>;
}

export const RandomAgent: Agent = {
  id: 'random',
  name: 'Random Move Agent',
  async chooseMove(
    state: BoardState,
    legalMoves: readonly Move[],
  ): Promise<Move | null> {
    const moves = legalMoves.length ? legalMoves : generateLegalMoves(state);
    if (!moves.length) return null;
    const index = Math.floor(Math.random() * moves.length);
    return moves[index] ?? null;
  },
};

export const SubutaiAgent: Agent = {
  id: 'subutai',
  name: 'Subutai',
  async chooseMove(
    state: BoardState,
    _legalMoves: readonly Move[],
    context?: AgentContext,
  ): Promise<Move | null> {
    return iterativeDeepen(state, 800, context?.lastMoveWasRotation ?? false);
  },
};

