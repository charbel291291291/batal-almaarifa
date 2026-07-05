/**
 * الحفظ المحلي — تفضيلات الوصولية، آخر إعدادات، إحصاءات الجهاز، حزمة الأسئلة المخصصة.
 */
import type { GameSettings, GameState } from '../types';
import { rankPlayers } from './scoreEngine';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // تخزين ممتلئ أو معطّل — تجاهل
  }
}

/* ---------- تفضيلات الوصولية ---------- */

export interface A11yPrefs {
  largeFont: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

const PREFS_KEY = 'bm_a11y';

export function loadPrefs(): A11yPrefs {
  return read(PREFS_KEY, { largeFont: false, highContrast: false, reducedMotion: false });
}

export function savePrefs(prefs: A11yPrefs): void {
  write(PREFS_KEY, prefs);
  applyPrefs(prefs);
}

/** يطبّق التفضيلات على عنصر html — تعمل مع كل الشاشات */
export function applyPrefs(prefs: A11yPrefs): void {
  const html = document.documentElement;
  html.classList.toggle('font-large', prefs.largeFont);
  html.classList.toggle('high-contrast', prefs.highContrast);
  html.classList.toggle('reduce-motion', prefs.reducedMotion);
}

/* ---------- آخر إعدادات لعبة ---------- */

const SETTINGS_KEY = 'bm_last_settings';

export function loadLastSettings(): GameSettings | null {
  return read<GameSettings | null>(SETTINGS_KEY, null);
}

export function saveLastSettings(settings: GameSettings): void {
  write(SETTINGS_KEY, settings);
}

/* ---------- إحصاءات الجهاز ---------- */

export interface DeviceStats {
  gamesPlayed: number;
  totalCorrect: number;
  totalWrong: number;
  champions: { name: string; avatar: string; score: number; date: string }[];
}

const STATS_KEY = 'bm_device_stats';

export function loadDeviceStats(): DeviceStats {
  return read(STATS_KEY, { gamesPlayed: 0, totalCorrect: 0, totalWrong: 0, champions: [] });
}

export function recordGameFinished(game: GameState): void {
  const stats = loadDeviceStats();
  const winner =
    game.players.find((p) => p.id === game.finalWinnerId) ?? rankPlayers(game.players)[0];
  stats.gamesPlayed += 1;
  for (const p of game.players) {
    stats.totalCorrect += p.correctCount;
    stats.totalWrong += p.wrongCount;
  }
  stats.champions.unshift({
    name: winner.name,
    avatar: winner.avatar,
    score: winner.score,
    date: new Date().toISOString().slice(0, 10),
  });
  stats.champions = stats.champions.slice(0, 20);
  write(STATS_KEY, stats);
}

export function clearDeviceStats(): void {
  localStorage.removeItem(STATS_KEY);
}

/* ---------- أفضل نتيجة تدريب فردي ---------- */

const SOLO_BEST_KEY = 'bm_solo_best';

export function loadSoloBest(): number {
  return read(SOLO_BEST_KEY, 0);
}

export function saveSoloBest(score: number): boolean {
  const best = loadSoloBest();
  if (score > best) {
    write(SOLO_BEST_KEY, score);
    return true;
  }
  return false;
}
