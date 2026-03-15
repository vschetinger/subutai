import type { BoardState, TopologyState } from '../engine';
import { applyMove } from '../engine/moves';
import { toggleTopology } from '../engine/auxetic';
import { PIECE_VALUE } from '../ai/evaluate';
import type { GameLog } from '../recording/log';
import type { SavedGame } from './types';
import type { PieceType } from '../engine';

function backRankString(boardState: BoardState): string {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const abbrev: Record<string, string> = {
    rook: 'R', knight: 'N', bishop: 'B', queen: 'Q', king: 'K',
  };
  return files
    .map((f) => {
      const piece = boardState.pieces.get(`${f}1` as import('../engine').SquareId);
      return piece ? abbrev[piece.type] ?? '?' : '?';
    })
    .join('');
}

function materialScore(state: BoardState): number {
  let white = 0;
  let black = 0;
  for (const [, piece] of state.pieces) {
    const v = PIECE_VALUE[piece.type as PieceType];
    if (piece.color === 'white') white += v;
    else black += v;
  }
  return white - black;
}

function buildNotation(log: GameLog, config960: string): string {
  const lines: string[] = [
    `[Chess960 "${config960}"]`,
    `[Seed "${log.randomSeed}"]`,
    '',
  ];
  let prevTopology: TopologyState = log.initialTopology;
  const entries = log.moves;
  for (let i = 0; i < entries.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const white = entries[i];
    const black = entries[i + 1];

    function fmt(entry: typeof white): string {
      if (entry.move.kind === 'topologyToggle') {
        const from = prevTopology;
        const to = from === 'A' ? 'B' : 'A';
        prevTopology = to;
        return `${from}\u2192${to}`;
      }
      return `${entry.move.from}\u2192${entry.move.to}`;
    }

    let line = `${moveNum}. ${fmt(white)}`;
    if (black) line += `  ${fmt(black)}`;
    lines.push(line);
  }
  return lines.join('\n');
}

export function buildSavedGame(
  log: GameLog,
  finalState: BoardState,
  termination: 'checkmate' | 'stalemate',
): SavedGame {
  const config960 = backRankString(log.initialState);
  const humanIsWhite = true;
  const winner = termination === 'checkmate'
    ? (finalState.sideToMove === 'white' ? 'black' : 'white')
    : null;
  const result: 'win' | 'loss' | 'draw' =
    termination === 'stalemate' ? 'draw'
    : winner === 'white' ? (humanIsWhite ? 'win' : 'loss')
    : (humanIsWhite ? 'loss' : 'win');

  let movesInA = 0;
  let movesInB = 0;
  let topo = log.initialTopology;
  for (const entry of log.moves) {
    const t = entry.topology ?? topo;
    if (t === 'A') movesInA++;
    else movesInB++;
    if (entry.move.kind === 'topologyToggle') topo = topo === 'A' ? 'B' : 'A';
  }

  const scoreHistory: number[] = [];
  let current: BoardState = log.initialState;
  scoreHistory.push(materialScore(current));
  for (const entry of log.moves) {
    if (entry.move.kind === 'topologyToggle') {
      current = toggleTopology(current);
    } else if (entry.move.from && entry.move.to) {
      current = applyMove(current, entry.move);
    }
    scoreHistory.push(materialScore(current));
  }

  const moves = log.moves.map((e) => ({
    move: e.move,
    topology: e.topology,
  }));

  return {
    id: `${log.id}-${Date.now()}`,
    createdAt: log.createdAt,
    config960,
    result,
    termination,
    moveCount: log.moves.length,
    moves,
    movesInA,
    movesInB,
    scoreHistory,
    notation: buildNotation(log, config960),
  };
}
