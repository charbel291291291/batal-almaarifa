/**
 * حالة التطبيق — Zustand. الواجهة ترسل أفعالاً فقط، والمنطق كله في المحرك.
 */
import { create } from 'zustand';
import type { GameAction, GameSettings, GameState, Question } from '../types';
import { createGame, reduce } from '../engine/gameEngine';
import { QUESTION_BANK } from '../data/questions';
import {
  applyPrefs,
  loadCustomPack,
  loadPrefs,
  recordGameFinished,
  saveLastSettings,
  savePrefs,
  type A11yPrefs,
} from '../lib/prefs';

export type Screen = 'home' | 'setup' | 'game' | 'solo' | 'editor' | 'stats';

interface AppStore {
  screen: Screen;
  game: GameState | null;
  /** بنك اللعبة الجارية (الأساسي + المخصص إن فُعّل) */
  bank: Question[];
  prefs: A11yPrefs;
  goHome: () => void;
  goSetup: () => void;
  goSolo: () => void;
  goEditor: () => void;
  goStats: () => void;
  setPrefs: (prefs: A11yPrefs) => void;
  startGame: (settings: GameSettings) => void;
  dispatch: (action: GameAction) => void;
}

export const useGameStore = create<AppStore>((set, get) => ({
  screen: 'home',
  game: null,
  bank: QUESTION_BANK,
  prefs: loadPrefs(),

  goHome: () => set({ screen: 'home', game: null }),
  goSetup: () => set({ screen: 'setup' }),
  goSolo: () => set({ screen: 'solo' }),
  goEditor: () => set({ screen: 'editor' }),
  goStats: () => set({ screen: 'stats' }),

  setPrefs: (prefs) => {
    savePrefs(prefs);
    set({ prefs });
  },

  startGame: (settings) => {
    saveLastSettings(settings);
    const bank = settings.includeCustom
      ? [...QUESTION_BANK, ...loadCustomPack()]
      : QUESTION_BANK;
    set({ screen: 'game', game: createGame(settings), bank });
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
