import { useEffect, useState } from 'react';
import { localStorageAdapter } from './storage';
import { matches960Pattern } from './filter';
import { GameCard } from './GameCard';
import type { SavedGame } from './types';

type SortKey = 'date' | 'result' | 'config960' | 'moveCount';
type SortDir = 'asc' | 'desc';

function sortGames(games: SavedGame[], key: SortKey, dir: SortDir): SavedGame[] {
  const cmp =
    key === 'date'
      ? (a: SavedGame, b: SavedGame) =>
          a.createdAt.localeCompare(b.createdAt)
      : key === 'result'
        ? (a: SavedGame, b: SavedGame) => {
            const order: Record<string, number> = { win: 0, loss: 1, draw: 2 };
            const ar = a.result ?? 'draw';
            const br = b.result ?? 'draw';
            return order[ar] - order[br];
          }
        : key === 'config960'
          ? (a: SavedGame, b: SavedGame) =>
              a.config960.localeCompare(b.config960)
          : (a: SavedGame, b: SavedGame) => a.moveCount - b.moveCount;
  const sorted = [...games].sort(cmp);
  return dir === 'desc' ? sorted.reverse() : sorted;
}

export function MemoryPanel({
  onGameActivate,
}: {
  onGameActivate?: (game: SavedGame) => void;
}) {
  const [games, setGames] = useState<SavedGame[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterPattern, setFilterPattern] = useState('');

  function loadGames() {
    localStorageAdapter.loadGames().then(setGames);
  }

  useEffect(() => {
    loadGames();
  }, []);

  const filtered = filterPattern.trim()
    ? games.filter((g) => matches960Pattern(g.config960, filterPattern.trim()))
    : games;
  const sorted = sortGames(filtered, sortKey, sortDir);

  return (
    <details
      className="memory-details"
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open) loadGames();
      }}
    >
      <summary>Memory ({games.length})</summary>
      <div className="memory-content">
        <div className="memory-toolbar">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="memory-sort-select"
          >
            <option value="date">Date</option>
            <option value="result">Result</option>
            <option value="config960">960 config</option>
            <option value="moveCount">Moves</option>
          </select>
          <button
            type="button"
            className="memory-sort-dir"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDir === 'asc' ? '\u2191' : '\u2193'}
          </button>
          <input
            type="text"
            className="memory-filter-input"
            placeholder="Filter: R****BBN"
            value={filterPattern}
            onChange={(e) => setFilterPattern(e.target.value)}
          />
          {filterPattern.trim() && (
            <button
              type="button"
              className="memory-filter-clear"
              onClick={() => setFilterPattern('')}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            className="memory-refresh-btn"
            onClick={loadGames}
            title="Refresh list"
          >
            Refresh
          </button>
        </div>
        <div className="memory-list">
          {sorted.length === 0 ? (
            <div className="memory-empty">
              {games.length === 0
                ? 'No games saved yet. Finish a game to see it here.'
                : 'No games match the filter.'}
            </div>
          ) : (
            sorted.map((game) => (
              <div
                key={game.id}
                className="memory-game-row"
                onDoubleClick={() => onGameActivate?.(game)}
              >
                <GameCard game={game} />
              </div>
            ))
          )}
        </div>
      </div>
    </details>
  );
}
