import type { GameStorage, SavedGame } from './types';

const STORAGE_KEY = 'subutai-games';

export const localStorageAdapter: GameStorage = {
  async loadGames(): Promise<SavedGame[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown[];
      return Array.isArray(parsed) ? (parsed as SavedGame[]) : [];
    } catch {
      return [];
    }
  },

  async saveGame(game: SavedGame): Promise<void> {
    const games = await this.loadGames();
    const updated = [...games, game];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },
};
