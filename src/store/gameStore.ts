/**
 * حالة التطبيق — Zustand. الواجهة ترسل أفعالاً فقط، والمنطق كله في المحرك.
 */
import { create } from 'zustand';
import type { GameAction, GameSettings, GameState, Question } from '../types';
import { createGame, reduce } from '../engine/gameEngine';
import {
  applyPrefs,
  loadPrefs,
  recordGameFinished,
  saveLastSettings,
  savePrefs,
  type A11yPrefs,
} from '../lib/prefs';

export type Screen = 'home' | 'setup' | 'game' | 'solo' | 'online' | 'stats';

interface AppStore {
  screen: Screen;
  game: GameState | null;
  bank: Question[];
  prefs: A11yPrefs;
  goHome: () => void;
  goSetup: () => void;
  goSolo: () => void;
  goOnline: () => void;
  goStats: () => void;
  setPrefs: (prefs: A11yPrefs) => void;
  startGame: (settings: GameSettings) => Promise<void>;
  dispatch: (action: GameAction) => void;
}

export const useGameStore = create<AppStore>((set, get) => ({
  screen: 'home',
  game: null,
  bank: [],
  prefs: loadPrefs(),

  goHome: () => set({ screen: 'home', game: null }),
  goSetup: () => set({ screen: 'setup' }),
  goSolo: () => set({ screen: 'solo' }),
  goOnline: () => set({ screen: 'online' }),
  goStats: () => set({ screen: 'stats' }),

  setPrefs: (prefs) => {
    savePrefs(prefs);
    set({ prefs });
  },

  startGame: async (settings) => {
    saveLastSettings(settings);
    const { QUESTION_BANK } = await import('../data/questions');
    set({ screen: 'game', game: createGame(settings), bank: QUESTION_BANK });
  },

  dispatch: (action) => {
    const { game, bank } = get();
    if (!game) return;
    const next = reduce(game, action, bank);
    // تسجيل إحصاءات الجهاز مرة واحدة عند بلوغ شاشة البطل
    if (game.phase.kind !== 'champion' && next.phase.kind === 'champion') {
      recordGameFinished(next);
    }
    set({ game: next });
  },
}));

// تطبيق تفضيلات الوصولية المحفوظة عند الإقلاع
applyPrefs(loadPrefs());

if (import.meta.env.DEV) {
  // للفحص أثناء التطوير فقط
  (window as unknown as Record<string, unknown>).__gameStore = useGameStore;
}
