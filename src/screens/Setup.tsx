import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { CategoryId, Difficulty, GameSettings, HostTone } from '../types';
import { ALL_CATEGORIES, DIFFICULTY_LABELS } from '../types';
import { loadLastSettings } from '../lib/prefs';
import { categoryLabel, difficultyLabel } from '../lib/i18n';
import { useI18n } from '../lib/useI18n';

const AVATARS = ['🦁', '🦅', '🐺', '🦊', '🐯', '🦉', '🐬', '🦄', '🐲', '🦜'];
const ALL_DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as Difficulty[];

interface PlayerDraft {
  name: string;
  avatar: string;
}

export function Setup() {
  const { goHome, startGame } = useGameStore();
  const { locale, t } = useI18n();
  const last = useMemo(loadLastSettings, []);

  const [players, setPlayers] = useState<PlayerDraft[]>(
    last?.players?.length
      ? last.players
      : [
          { name: '', avatar: AVATARS[0] },
          { name: '', avatar: AVATARS[1] },
        ],
  );
  const [categories, setCategories] = useState<CategoryId[]>(last?.categories ?? ALL_CATEGORIES);
  const [difficulties, setDifficulties] = useState<Difficulty[]>(last?.difficulties ?? ['easy', 'medium']);
  const [r1PerPlayer, setR1PerPlayer] = useState(last?.r1QuestionsPerPlayer ?? 3);
  const [r2Count, setR2Count] = useState(last?.r2Questions ?? 6);
  const [r3Chain, setR3Chain] = useState(last?.r3ChainLength ?? 4);
  const [timerSpeed, setTimerSpeed] = useState(last?.timerSpeed ?? 1);
  const [answerMode, setAnswerMode] = useState<'auto' | 'options'>(last?.answerMode ?? 'auto');
  const [tone, setTone] = useState<HostTone>(last?.tone ?? 'lebanese');

  const toggleCategory = (c: CategoryId) =>
    setCategories((prev) =>
      prev.includes(c) ? (prev.length > 1 ? prev.filter((x) => x !== c) : prev) : [...prev, c],
    );

  const toggleDifficulty = (d: Difficulty) =>
    setDifficulties((prev) =>
      prev.includes(d) ? (prev.length > 1 ? prev.filter((x) => x !== d) : prev) : [...prev, d],
    );

  const start = () => {
    const settings: GameSettings = {
      players: players.map((p, i) => ({
        name: p.name.trim() || t('player', { count: i + 1 }),
        avatar: p.avatar,
      })),
      categories,
      difficulties,
      r1QuestionsPerPlayer: r1PerPlayer,
      r2Questions: r2Count,
      r3ChainLength: r3Chain,
      timerSpeed,
      answerMode,
      tone,
      soundOn: true,
    };
    void startGame(settings);
  };

  return (
    <main className="relative z-10 mx-auto w-full max-w-2xl px-5 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-black text-gold-2">{t('setupTitle')}</h1>
          <button type="button" className="btn-ghost !min-h-11 !py-2" onClick={goHome}>
            {t('back')}
          </button>
        </div>

        {/* اللاعبون */}
        <section className="glass mb-5 p-5">
          <h2 className="mb-4 text-xl font-bold">{t('playersCount', { count: players.length })}</h2>
          <div className="flex flex-col gap-3">
            {players.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost !min-h-12 !px-3 !py-1 text-2xl"
                  aria-label={t('changeAvatar')}
                  onClick={() =>
                    setPlayers((prev) =>
                      prev.map((x, j) =>
                        j === i
                          ? { ...x, avatar: AVATARS[(AVATARS.indexOf(x.avatar) + 1) % AVATARS.length] }
                          : x,
                      ),
                    )
                  }
                >
                  {p.avatar}
                </button>
                <input
                  className="text-input flex-1"
                  placeholder={t('player', { count: i + 1 })}
                  value={p.name}
                  maxLength={16}
                  onChange={(e) =>
                    setPlayers((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                  aria-label={t('playerName', { count: i + 1 })}
                />
                <span className="chip !min-h-0 hidden !py-1 text-xs sm:inline" title={t('buzzerKey')}>
                  {t('buzzer', { key: i + 1 })}
                </span>
                {players.length > 2 && (
                  <button
                    type="button"
                    className="btn-ghost !min-h-11 !px-3 !py-2 text-danger"
                    aria-label={t('removePlayer')}
                    onClick={() => setPlayers((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {players.length < 6 && (
            <button
              type="button"
              className="btn-ghost mt-3 w-full"
              onClick={() =>
                setPlayers((prev) => [...prev, { name: '', avatar: AVATARS[prev.length % AVATARS.length] }])
              }
            >
              {t('addPlayer')}
            </button>
          )}
          {players.length > 2 && (
            <p className="mt-3 text-center text-xs text-ink-dim">
              {t('showdownHint')}
            </p>
          )}
        </section>

        {/* الفئات */}
        <section className="glass mb-5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">{t('categoriesCount', { count: categories.length })}</h2>
            <button
              type="button"
              className="chip"
              onClick={() =>
                setCategories(categories.length === ALL_CATEGORIES.length ? ['general'] : ALL_CATEGORIES)
              }
            >
              {categories.length === ALL_CATEGORIES.length ? t('clearAll') : t('selectAll')}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                data-active={categories.includes(c)}
                aria-pressed={categories.includes(c)}
                onClick={() => toggleCategory(c)}
              >
                {categoryLabel(c, locale)}
              </button>
            ))}
          </div>
        </section>

        {/* الصعوبة والإيقاع */}
        <section className="glass mb-5 p-5">
          <h2 className="mb-4 text-xl font-bold">{t('difficulty')}</h2>
          <div className="mb-5 flex flex-wrap gap-2">
            {ALL_DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                className="chip"
                data-active={difficulties.includes(d)}
                aria-pressed={difficulties.includes(d)}
                onClick={() => toggleDifficulty(d)}
              >
                {difficultyLabel(d, locale)}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
              {t('r1PerPlayer')}
              <select
                className="text-input"
                value={r1PerPlayer}
                onChange={(e) => setR1PerPlayer(Number(e.target.value))}
              >
                {[2, 3, 4, 5, 7, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
              {t('r2Questions')}
              <select
                className="text-input"
                value={r2Count}
                onChange={(e) => setR2Count(Number(e.target.value))}
              >
                {[4, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
              {t('chainLength')}
              <select
                className="text-input"
                value={r3Chain}
                onChange={(e) => setR3Chain(Number(e.target.value))}
              >
                {[3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
              {t('timerSpeed')}
              <select
                className="text-input"
                value={timerSpeed}
                onChange={(e) => setTimerSpeed(Number(e.target.value))}
              >
                <option value={0.7}>{t('fast')}</option>
                <option value={1}>{t('normal')}</option>
                <option value={1.4}>{t('relaxed')}</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
              {t('answerMode')}
              <select
                className="text-input"
                value={answerMode}
                onChange={(e) => setAnswerMode(e.target.value as 'auto' | 'options')}
              >
                <option value="auto">{t('autoMode')}</option>
                <option value="options">{t('optionsMode')}</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
              {t('hostTone')}
              <select
                className="text-input"
                value={tone}
                onChange={(e) => setTone(e.target.value as HostTone)}
              >
                <option value="lebanese">{t('lebaneseTone')}</option>
                <option value="fusha">{t('formalTone')}</option>
              </select>
            </label>
          </div>
        </section>

        <button type="button" className="btn-primary w-full text-xl" onClick={start}>
          {t('startGame')}
        </button>
      </motion.div>
    </main>
  );
}
