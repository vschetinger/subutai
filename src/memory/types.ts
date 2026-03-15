import type { Move, TopologyState } from '../engine';

export interface SavedGame {
  readonly id: string;
  readonly createdAt: string;
  readonly config960: string;
  readonly result: 'win' | 'loss' | 'draw';
  readonly termination: 'checkmate' | 'stalemate';
  readonly moveCount: number;
  readonly moves: readonly { move: Move; topology?: TopologyState }[];
  readonly movesInA: number;
  readonly movesInB: number;
  readonly scoreHistory: number[];
  readonly notation: string;
}

export interface GameStorage {
  loadGames(): Promise<SavedGame[]>;
  saveGame(game: SavedGame): Promise<void>;
}
