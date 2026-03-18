import type { GameStorage, SavedGame } from './types';

const STORAGE_KEY = 'subutai-games';

function loadRawGames(): SavedGame[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedGame[];
  } catch {
    return [];
  }
}

function normalizeLoadedGames(games: SavedGame[]): SavedGame[] {
  return games.map((g) => {
    const status = g.status ?? 'complete';
    return {
      ...g,
      status,
    };
  });
}

export const localStorageAdapter: GameStorage = {
  async loadGames(): Promise<SavedGame[]> {
    return normalizeLoadedGames(loadRawGames());
  },

  async saveGame(game: SavedGame): Promise<void> {
    const games = loadRawGames();
    const updated = [...games, game];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  async saveOrUpdateGame(game: SavedGame): Promise<void> {
    const games = loadRawGames();
    const idx = games.findIndex((g) => g.id === game.id);
    if (idx === -1) {
      games.push(game);
    } else {
      games[idx] = game;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  },

  async deleteGame(id: string): Promise<void> {
    const games = loadRawGames();
    const filtered = games.filter((g) => g.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },
};
