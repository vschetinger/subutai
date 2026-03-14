import './App.css';
import type { BoardState, Color, Move, PieceType, SquareId, TopologyState } from './engine';
import { createStartingPosition, createPositionFromBackRankKey, isValidChess960Key } from './engine';
import { allSquares } from './engine/board';
import {
  applyMove,
  generateLegalMoves,
  isCheckmate,
  isStalemate,
  isInCheck,
  isSquareAttacked,
  countAttackers,
  findKing,
  findCheckingPieces,
} from './engine/moves';
import { toggleTopology, computeBoardLayout, tilePixelCenter } from './engine/auxetic';
import { SubutaiAgent } from './ai/agents';
import { PIECE_VALUE } from './ai/evaluate';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameLog } from './recording/log';
import { appendMove, createGameLog } from './recording/log';

type GameStatus = 'playing' | 'checkmate' | 'stalemate';

function backRankString(boardState: BoardState): string {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const abbrev: Record<string, string> = {
    rook: 'R', knight: 'N', bishop: 'B', queen: 'Q', king: 'K',
  };
  return files
    .map((f) => {
      const piece = boardState.pieces.get(`${f}1` as SquareId);
      return piece ? abbrev[piece.type] ?? '?' : '?';
    })
    .join('');
}

function App() {
  const [seed, setSeed] = useState<number>(1);
  const [state, setState] = useState<BoardState>(() => createStartingPosition(1));
  const [initialState, setInitialState] = useState<BoardState>(() => createStartingPosition(1));
  const [selected, setSelected] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>(() =>
    generateLegalMoves(createStartingPosition(1)),
  );
  const [log, setLog] = useState<GameLog>(() =>
    createGameLog('game-1', createStartingPosition(1), 1),
  );
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [previewTopology, setPreviewTopology] = useState<TopologyState | null>(null);
  const [lastMove, setLastMove] = useState<{ from?: SquareId; to?: SquareId } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showMaterialPopup, setShowMaterialPopup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showThreats, setShowThreats] = useState(false);
  const [formationLocked, setFormationLocked] = useState(false);
  const [lockedFormationKey, setLockedFormationKey] = useState<string | null>(null);
  const [formationInputMode, setFormationInputMode] = useState(false);
  const [formationInputValue, setFormationInputValue] = useState('');
  const formationInputRef = useRef<HTMLInputElement>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [boardSize, setBoardSize] = useState(() =>
    Math.min(window.innerWidth - 32, 520),
  );

  useEffect(() => {
    function onResize() {
      setBoardSize(Math.min(window.innerWidth - 32, 520));
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (formationInputMode) formationInputRef.current?.focus();
  }, [formationInputMode]);

  function applyFormationCode() {
    const raw = formationInputValue.trim().toUpperCase();
    if (!raw) {
      setFormationInputMode(false);
      setFormationInputValue('');
      return;
    }
    if (!isValidChess960Key(raw)) {
      setFormationInputValue(raw);
      return;
    }
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    const initial = createPositionFromBackRankKey(raw);
    setState(initial);
    setInitialState(initial);
    setSelected(null);
    setLegalMoves(generateLegalMoves(initial));
    setLog(createGameLog(`game-${Date.now()}`, initial, Date.now()));
    setGameStatus('playing');
    setPreviewTopology(null);
    setLastMove(null);
    setFormationLocked(true);
    setLockedFormationKey(raw);
    setFormationInputMode(false);
    setFormationInputValue('');
  }

  function cancelFormationInput() {
    setFormationInputMode(false);
    setFormationInputValue('');
  }

  const tileBase = boardSize / 8;

  function checkGameOver(nextState: BoardState) {
    // #region agent log
    const lm = generateLegalMoves(nextState);
    const inChk = isCheckmate(nextState);
    const inStale = isStalemate(nextState);
    const kingSq = findKing(nextState, nextState.sideToMove);
    if (
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1')
    ) {
      fetch('http://127.0.0.1:7519/ingest/37bd3e22-11f2-45c3-b325-8dbcf69a5172',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'389750'},body:JSON.stringify({sessionId:'389750',location:'App.tsx:checkGameOver',message:'checkGameOver called',data:{sideToMove:nextState.sideToMove,topology:nextState.topologyState,legalMoveCount:lm.length,isCheckmate:inChk,isStalemate:inStale,kingSq,pieceCount:nextState.pieces.size},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    }
    // #endregion
    if (isCheckmate(nextState)) {
      setGameStatus('checkmate');
    } else if (isStalemate(nextState)) {
      setGameStatus('stalemate');
    }
  }

  function startNewGame() {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    const newSeed = Date.now();
    const initial =
      formationLocked && lockedFormationKey
        ? createPositionFromBackRankKey(lockedFormationKey)
        : createStartingPosition(newSeed);
    setSeed(newSeed);
    setState(initial);
    setInitialState(initial);
    setSelected(null);
    setLegalMoves(generateLegalMoves(initial));
    setLog(createGameLog(`game-${newSeed}`, initial, newSeed));
    setGameStatus('playing');
    setPreviewTopology(null);
    setLastMove(null);
  }

  function toggleFormationLock() {
    setFormationLocked((v) => {
      if (!v) setLockedFormationKey(backRankString(initialState));
      else setLockedFormationKey(null);
      return !v;
    });
  }

  function handleRotate() {
    if (gameStatus !== 'playing') return;
    if (currentPlayer !== 'human') return;

    const next = toggleTopology(state);

    const ourKing = findKing(next, state.sideToMove);
    if (!ourKing) return;
    const opponent = state.sideToMove === 'white' ? 'black' : 'white';
    if (isSquareAttacked(next, ourKing, opponent as 'white' | 'black', next.topologyState)) return;

    setState(next);
    const nextMoves = generateLegalMoves(next);
    setLegalMoves(nextMoves);
    setSelected(null);
    setPreviewTopology(null);

    const toggleMove: Move = { kind: 'topologyToggle' };
    setLog((prev) => appendMove(prev, toggleMove));
    setLastMove(null);

    checkGameOver(next);
  }

  const currentPlayer = state.sideToMove === 'white' ? 'human' : 'ai';

  const scheduleAiMove = useCallback(
    (
      boardState: BoardState,
      moves: Move[],
      lastMoveWasRotation: boolean,
    ) => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      aiTimerRef.current = setTimeout(async () => {
        const move = await SubutaiAgent.chooseMove(boardState, moves, {
          lastMoveWasRotation,
        });
        if (!move) return;

        const next =
          move.kind === 'topologyToggle'
            ? toggleTopology(boardState)
            : applyMove(boardState, move);

        setState(next);
        const nextMoves = generateLegalMoves(next);
        // #region agent log
        if (
          typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1')
        ) {
          fetch('http://127.0.0.1:7519/ingest/37bd3e22-11f2-45c3-b325-8dbcf69a5172',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'389750'},body:JSON.stringify({sessionId:'389750',location:'App.tsx:scheduleAiMove',message:'AI moved, human legal moves computed',data:{aiMove:{kind:move.kind,from:move.from,to:move.to},topology:next.topologyState,humanLegalMoves:nextMoves.length,humanMoveSample:nextMoves.slice(0,8).map(m=>({from:m.from,to:m.to,kind:m.kind})),humanSide:next.sideToMove},timestamp:Date.now(),hypothesisId:'H1,H2'})}).catch(()=>{});
        }
        // #endregion
        setLegalMoves(nextMoves);
        setSelected(null);
        setLog((prev) => appendMove(prev, move));
        setLastMove(
          move.kind === 'topologyToggle'
            ? null
            : { from: move.from, to: move.to },
        );
        checkGameOver(next);
      }, 650);
    },
    [],
  );

  const lastMoveWasRotation =
    log.moves.length > 0 &&
    log.moves[log.moves.length - 1]?.move.kind === 'topologyToggle';

  const materialBreakdown = useMemo(() => {
    const pieceOrder: PieceType[] = ['queen', 'rook', 'bishop', 'knight', 'pawn'];
    const white: Record<PieceType, number> = {
      queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0, king: 0,
    };
    const black: Record<PieceType, number> = {
      queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0, king: 0,
    };
    let whiteTotal = 0;
    let blackTotal = 0;
    for (const [, piece] of state.pieces) {
      const v = PIECE_VALUE[piece.type];
      if (piece.color === 'white') {
        white[piece.type]++;
        whiteTotal += v;
      } else {
        black[piece.type]++;
        blackTotal += v;
      }
    }
    const startCount: Record<PieceType, number> = {
      queen: 1, rook: 2, bishop: 2, knight: 2, pawn: 8, king: 1,
    };
    const capturedByWhite: { type: PieceType; count: number; value: number }[] = [];
    const capturedByBlack: { type: PieceType; count: number; value: number }[] = [];
    let capturedByWhiteTotal = 0;
    let capturedByBlackTotal = 0;
    for (const type of pieceOrder) {
      const goneFromBlack = Math.max(0, startCount[type] - black[type]);
      if (goneFromBlack > 0) {
        const value = goneFromBlack * PIECE_VALUE[type];
        capturedByWhite.push({ type, count: goneFromBlack, value });
        capturedByWhiteTotal += value;
      }
      const goneFromWhite = Math.max(0, startCount[type] - white[type]);
      if (goneFromWhite > 0) {
        const value = goneFromWhite * PIECE_VALUE[type];
        capturedByBlack.push({ type, count: goneFromWhite, value });
        capturedByBlackTotal += value;
      }
    }
    return {
      score: whiteTotal - blackTotal,
      capturedByWhite,
      capturedByBlack,
      capturedByWhiteTotal,
      capturedByBlackTotal,
      whiteTotal,
      blackTotal,
    };
  }, [state.pieces]);

  const materialScore = materialBreakdown.score;

  useEffect(() => {
    if (gameStatus !== 'playing') return;
    if (currentPlayer !== 'ai') return;
    scheduleAiMove(state, legalMoves, lastMoveWasRotation);
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [currentPlayer, state, legalMoves, gameStatus, scheduleAiMove, lastMoveWasRotation]);

  const highlightedTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    const targets = new Set<string>();
    for (const move of legalMoves) {
      if (move.from === selected && move.to) {
        targets.add(move.to);
      }
    }
    return targets;
  }, [legalMoves, selected]);

  const checkSquares = useMemo(() => {
    const empty = { king: null as string | null, checkers: new Set<string>() };
    if (previewTopology && previewTopology !== state.topologyState) {
      const toggled = toggleTopology(state);
      const viewState: BoardState = { ...toggled, sideToMove: state.sideToMove };
      const king = findKing(viewState, state.sideToMove);
      if (!king) return empty;
      const opp = state.sideToMove === 'white' ? 'black' as const : 'white' as const;
      if (!isSquareAttacked(viewState, king, opp, viewState.topologyState)) return empty;
      return { king, checkers: new Set<string>(findCheckingPieces(viewState)) };
    }
    if (!isInCheck(state)) return empty;
    const king = findKing(state, state.sideToMove);
    const checkers = new Set<string>(findCheckingPieces(state));
    return { king, checkers };
  }, [previewTopology, state]);

  const threatenedSquares = useMemo(() => {
    if (!showThreats) return new Map<string, number>();
    const opp: Color = state.sideToMove === 'white' ? 'black' : 'white';
    const topo = previewTopology ?? state.topologyState;
    const analyzeState: BoardState = { ...state, topologyState: topo };
    const counts = new Map<string, number>();
    for (const sq of allSquares) {
      const c = countAttackers(analyzeState, sq, opp, topo);
      if (c > 0) counts.set(sq, c);
    }
    return counts;
  }, [showThreats, state, previewTopology]);

  function onSquareClick(square: string) {
    if (gameStatus !== 'playing') return;
    if (currentPlayer !== 'human') return;
    if (!selected) {
      setSelected(square);
      return;
    }
    if (selected === square) {
      setSelected(null);
      return;
    }
    const move = legalMoves.find(
      (m) => m.from === selected && m.to === square,
    );
    if (!move) {
      setSelected(square);
      return;
    }
    const next = applyMove(state, move);
    setState(next);
    const nextMoves = generateLegalMoves(next);
    // #region agent log
    if (
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1')
    ) {
      fetch('http://127.0.0.1:7519/ingest/37bd3e22-11f2-45c3-b325-8dbcf69a5172',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'389750'},body:JSON.stringify({sessionId:'389750',location:'App.tsx:onSquareClick',message:'Human moved, AI legal moves computed',data:{humanMove:{kind:move.kind,from:move.from,to:move.to},topology:next.topologyState,aiLegalMoves:nextMoves.length,aiSide:next.sideToMove},timestamp:Date.now(),hypothesisId:'H1,H2'})}).catch(()=>{});
    }
    // #endregion
    setLegalMoves(nextMoves);
    setSelected(null);
    setLog((prev) => appendMove(prev, move));
    setLastMove({ from: move.from, to: move.to });
    checkGameOver(next);
  }

  const squares = useMemo(() => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return ranks.flatMap((rank) =>
      files.map((file) => `${file}${rank}`),
    );
  }, []);

  const canRotate = useMemo(() => {
    if (currentPlayer !== 'human') return false;
    const lastEntry = log.moves[log.moves.length - 1];
    if (lastEntry?.move.kind === 'topologyToggle') return false;
    const toggled = toggleTopology(state);
    const king = findKing(toggled, state.sideToMove);
    if (!king) return false;
    const opp = state.sideToMove === 'white' ? 'black' : 'white';
    return !isSquareAttacked(toggled, king, opp as 'white' | 'black', toggled.topologyState);
  }, [currentPlayer, state, log.moves]);

  const displayTopology = previewTopology ?? state.topologyState;

  const layout = useMemo(
    () => computeBoardLayout(displayTopology, boardSize),
    [displayTopology, boardSize],
  );

  const scale = layout.tileSize / tileBase;

  const positionLabel = backRankString(initialState);

  // Notation string for copy
  const notationString = useMemo(() => {
    const lines: string[] = [
      `[Chess960 "${positionLabel}"]`,
      `[Seed "${seed}"]`,
      '',
    ];
    let prevTopology: TopologyState = initialState.topologyState;
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
  }, [log.moves, positionLabel, seed, initialState.topologyState]);

  function copyNotation() {
    navigator.clipboard.writeText(notationString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const gameOverMessage = useMemo(() => {
    if (gameStatus === 'checkmate') {
      const winner = state.sideToMove === 'white' ? 'Black' : 'White';
      return `Checkmate \u2014 ${winner} wins!`;
    }
    if (gameStatus === 'stalemate') {
      return 'Stalemate \u2014 Draw';
    }
    return null;
  }, [gameStatus, state.sideToMove]);

  return (
    <div className="app-root" style={{ '--board-size': `${boardSize}px` } as React.CSSProperties}>
      <header className="app-header">
        <h1>subutai</h1>
      </header>

      <div
        className={`board${previewTopology ? ' previewing' : ''}`}
        style={{ width: boardSize, height: boardSize }}
      >
        {squares.map((sq) => {
          const piece = state.pieces.get(sq as SquareId);
          const isDark =
            ((sq.charCodeAt(0) - 'a'.charCodeAt(0)) +
              (Number(sq[1]) - 1)) %
            2 ===
            1;
          const isSelected = selected === sq;
          const isTarget = highlightedTargets.has(sq);
          const isLastFrom = lastMove?.from === sq;
          const isLastTo = lastMove?.to === sq;
          const isCheckedKing = checkSquares.king === sq;
          const isCheckingPiece = checkSquares.checkers.has(sq);
          const threatCount = threatenedSquares.get(sq) ?? 0;

          const { cx, cy, angle } = tilePixelCenter(
            sq as SquareId,
            displayTopology,
            layout,
          );

          const tx = cx - tileBase / 2;
          const ty = cy - tileBase / 2;

          return (
            <button
              key={sq}
              type="button"
              className={[
                'tile',
                isDark ? 'dark' : 'light',
                isSelected ? 'selected' : '',
                isTarget ? 'target' : '',
                isLastFrom ? 'last-from' : '',
                isLastTo ? 'last-to' : '',
                isCheckedKing ? (gameStatus === 'checkmate' ? 'mated-king' : 'checked-king') : '',
                isCheckingPiece ? (gameStatus === 'checkmate' ? 'mating-piece' : 'checking-piece') : '',
                threatCount > 0 ? 'threatened' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                width: tileBase,
                height: tileBase,
                transform: `translate(${tx}px, ${ty}px) rotate(${angle}deg) scale(${scale})`,
                ...(threatCount > 0 ? { '--threat-n': threatCount } as React.CSSProperties : {}),
              }}
              onClick={() => onSquareClick(sq)}
            >
              {piece ? (
                <span
                  className={[
                    'piece',
                    piece.color === 'white'
                      ? 'piece-white'
                      : 'piece-black',
                  ].join(' ')}
                  style={angle ? { transform: `rotate(${-angle}deg)` } : undefined}
                >
                  {glyphForPiece(piece.color, piece.type)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {gameOverMessage && (
        <div className="game-over-banner">{gameOverMessage}</div>
      )}

      <div className="board-actions">
        <div className="action-group action-group-reset-lock">
          <button
            type="button"
            className="action-btn"
            onClick={startNewGame}
            title="New game"
          >
            {'\u21BB'}
          </button>
          <button
            type="button"
            className={`action-btn${formationLocked ? ' active' : ''}`}
            onClick={toggleFormationLock}
            title={formationLocked ? 'Unlock formation (new games will be random)' : 'Lock formation (new game keeps this 960)'}
          >
            {'\u{1F512}'}
          </button>
        </div>

        <div className="action-group action-group-center">
          <button
            type="button"
            className={`action-btn${showThreats ? ' active' : ''}`}
            title="Toggle threat map"
            onClick={() => setShowThreats((v) => !v)}
          >
            {'\u26A0'}
          </button>
          <button
            type="button"
            className="action-btn preview-btn"
            title="Preview rotation"
            disabled={currentPlayer !== 'human'}
            onPointerEnter={() => {
              if (currentPlayer === 'human') {
                setPreviewTopology(state.topologyState === 'A' ? 'B' : 'A');
              }
            }}
            onPointerLeave={() => setPreviewTopology(null)}
          >
            {'\u{1F441}'}
          </button>
          <button
            type="button"
            className="rotate-btn"
            onClick={handleRotate}
            disabled={!canRotate}
          >
            Rotate &middot; {state.topologyState === 'A' ? 'A \u2192 B' : 'B \u2192 A'}
          </button>
        </div>
        <div
          className="material-score-wrap"
          onMouseEnter={() => setShowMaterialPopup(true)}
          onMouseLeave={() => setShowMaterialPopup(false)}
        >
          <span
            className={`material-score ${materialScore > 0 ? 'positive' : materialScore < 0 ? 'negative' : 'zero'}`}
          >
            {materialScore > 0 ? '+' : ''}
            {(materialScore / 100).toFixed(1)}
          </span>
          {showMaterialPopup && (
            <div className="material-score-popup" role="tooltip">
              <div className="material-captured-section">
                <div className="material-captured-label">Captured by White</div>
                {materialBreakdown.capturedByWhite.length === 0 ? (
                  <div className="material-captured-list">—</div>
                ) : (
                  <div className="material-captured-list">
                    {materialBreakdown.capturedByWhite
                      .map(({ type, count, value }) => {
                        const label = type === 'knight' ? 'N' : type[0].toUpperCase();
                        return `${label}×${count} (${(value / 100).toFixed(1)})`;
                      })
                      .join(', ')}
                    <span className="material-captured-total">
                      {' → '}{(materialBreakdown.capturedByWhiteTotal / 100).toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              <div className="material-captured-section">
                <div className="material-captured-label">Captured by Black</div>
                {materialBreakdown.capturedByBlack.length === 0 ? (
                  <div className="material-captured-list">—</div>
                ) : (
                  <div className="material-captured-list">
                    {materialBreakdown.capturedByBlack
                      .map(({ type, count, value }) => {
                        const label = type === 'knight' ? 'N' : type[0].toUpperCase();
                        return `${label}×${count} (${(value / 100).toFixed(1)})`;
                      })
                      .join(', ')}
                    <span className="material-captured-total">
                      {' → '}{(materialBreakdown.capturedByBlackTotal / 100).toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className="action-btn"
          onClick={() => setShowHelp(true)}
          title="Rules & info"
        >
          ?
        </button>
      </div>

      <div className="position-label-wrap">
        <span className="position-label">Chess960: {positionLabel}</span>
        {!formationInputMode ? (
          <button
            type="button"
            className="position-edit-btn"
            onDoubleClick={() => {
              setFormationInputValue(positionLabel);
              setFormationInputMode(true);
            }}
            title="Double-click to enter formation code"
          >
            edit
          </button>
        ) : (
          <span className="position-input-wrap">
            <input
              ref={formationInputRef}
              type="text"
              className="position-input"
              value={formationInputValue}
              onChange={(e) => setFormationInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFormationCode();
                if (e.key === 'Escape') cancelFormationInput();
              }}
              onBlur={applyFormationCode}
              placeholder="e.g. RQKRNBBN"
              maxLength={8}
            />
            {formationInputValue && !isValidChess960Key(formationInputValue.trim().toUpperCase()) && (
              <span className="position-input-error">Invalid 960 code</span>
            )}
          </span>
        )}
      </div>

      <details className="move-log-details">
        <summary>Moves ({log.moves.length})</summary>
        <div className="move-log-content">
          <pre className="move-log-text">{notationString}</pre>
          <button type="button" className="copy-btn" onClick={copyNotation}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
      </details>

      {showHelp && (
        <div className="help-backdrop" onClick={() => setShowHelp(false)}>
          <div className="help-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Subutai &mdash; Auxetic Chess960</h2>
            <p>
              Subutai combines <strong>Chess960</strong> (Fischer random chess) with an
              <strong> <a href="https://www.youtube.com/shorts/RLO48ETn6LE" target="_blank"> auxetic board</a></strong> that can rotate between two stable states.
            </p>
            <p><strong>How it works:</strong></p>
            <ul>
              <li>The board is divided into 4&times;4 blocks of 2&times;2 squares.</li>
              <li>Pressing <em>Rotate</em> flips all blocks &plusmn;90&deg;, reshuffling
                which squares are adjacent. This <strong>costs your turn</strong>.</li>
              <li>Hover the eye button to preview the rotation without committing.</li>
              <li>The starting position is a random Chess960 arrangement.</li>
              <li>Standard chess rules apply: you cannot move into check, checkmate ends the game.</li>
            </ul>
            <p>
              <a href="https://en.wikipedia.org/wiki/Fischer_random_chess" target="_blank" rel="noopener noreferrer">
                Chess960 on Wikipedia
              </a>
            </p>
            <button type="button" className="help-close-btn" onClick={() => setShowHelp(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function glyphForPiece(color: string, type: string): string {
  const map: Record<string, string> = {
    'white-pawn': '\u265F\uFE0E',
    'white-knight': '\u265E',
    'white-bishop': '\u265D',
    'white-rook': '\u265C',
    'white-queen': '\u265B',
    'white-king': '\u265A',
    'black-pawn': '\u265F\uFE0E',
    'black-knight': '\u265E',
    'black-bishop': '\u265D',
    'black-rook': '\u265C',
    'black-queen': '\u265B',
    'black-king': '\u265A',
  };
  return map[`${color}-${type}`] ?? '';
}

export default App;
