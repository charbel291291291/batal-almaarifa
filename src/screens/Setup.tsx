import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { CategoryId, Difficulty, GameSettings, HostTone } from '../types';
import { ALL_CATEGORIES, CATEGORY_LABELS, DIFFICULTY_LABELS } from '../types';
import { loadCustomPack, loadLastSettings } from '../lib/prefs';

const AVATARS = ['🦁', '🦅', '🐺', '🦊', '🐯', '🦉', '🐬', '🦄', '🐲', '🦜'];
const ALL_DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as Difficulty[];

interface PlayerDraft {
  name: string;
  avatar: string;
}

export function Setup() {
  const { goHome, startGame } = useGameStore();
  const last = useMemo(loadLastSettings, []);
  const customCount = useMemo(() => loadCustomPack().length, []);

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
  const [includeCustom, setIncludeCustom] = useState(last?.includeCustom ?? false);

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
        name: p.name.trim() || `لاعب ${i + 1}`,
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
      includeCustom: includeCustom && customCount > 0,
      soundOn: true,
    };
    startGame(settings);
  };

  return (
    <main className="relative z-10 mx-auto w-full max-w-2xl px-5 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-black text-gold-2">تجهيز اللعبة</h1>
          <button type="button" className="btn-ghost !min-h-11 !py-2" onClick={goHome}>
            → رجوع
          </button>
        </div>

        {/* اللاعبون */}
        <section className="glass mb-5 p-5">
          <h2 className="mb-4 text-xl font-bold">اللاعبون ({players.length})</h2>
          <div className="flex flex-col gap-3">
            {players.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost !min-h-12 !px-3 !py-1 text-2xl"
                  aria-label="تغيير الصورة الرمزية"
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
                  placeholder={`لاعب ${i + 1}`}
                  value={p.name}
                  maxLength={16}
                  onChange={(e) =>
                    setPlayers((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                  aria-label={`اسم اللاعب ${i + 1}`}
                />
                <span className="chip !min-h-0 hidden !py-1 text-xs sm:inline" title="مفتاح الجرس">
                  جرس: {i + 1}
                </span>
                {players.length > 2 && (
                  <button
                    type="button"
                    className="btn-ghost !min-h-11 !px-3 !py-2 text-danger"
                    aria-label="حذف اللاعب"
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
              + إضافة لاعب
            </button>
          )}
          {players.length > 2 && (
            <p className="mt-3 text-center text-xs text-ink-dim">
              ⚔️ بثلاثة لاعبين أو أكثر تُفتح جولة «المواجهة» — الخاسر يُقصى!
            </p>
          )}
        </section>

        {/* الفئات */}
        <section className="glass mb-5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">الفئات ({categories.length})</h2>
            <button
              type="button"
              className="chip"
              onClick={() =>
                setCategories(categories.length === ALL_CATEGORIES.length ? ['general'] : ALL_CATEGORIES)
              }
            >
              {categories.length === ALL_CATEGORIES.length ? 'مسح الكل' : 'اختيار الكل'}
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
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          {customCount > 0 && (
            <label className="mt-4 flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                className="size-5 accent-[#e8b84b]"
                checked={includeCustom}
                onChange={(e) => setIncludeCustom(e.target.checked)}
              />
              تضمين أسئلتي من صانع الأسئلة ({customCount})
            </label>
          )}
        </section>

        {/* الصعوبة والإيقاع */}
        <section className="glass mb-5 p-5">
          <h2 className="mb-4 text-xl font-bold">الصعوبة</h2>
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
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
              أسئلة الانطلاقة لكل لاعب
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
              أسئلة «من يسبق؟»
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
              طول السلسلة الذهبية
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
              سرعة المؤقت
              <select
                className="text-input"
                value={timerSpeed}
                onChange={(e) => setTimerSpeed(Number(e.target.value))}
              >
                <option value={0.7}>⚡ سريع</option>
                <option value={1}>عادي</option>
                <option value={1.4}>🐢 هادئ</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
              نمط الإجابة
              <select
                className="text-input"
                value={answerMode}
                onChange={(e) => setAnswerMode(e.target.value as 'auto' | 'options')}
              >
                <option value="auto">حسب السؤال (كتابة وخيارات)</option>
                <option value="options">خيارات دائماً</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
              نبرة المقدّم
              <select
                className="text-input"
                value={tone}
                onChange={(e) => setTone(e.target.value as HostTone)}
              >
                <option value="lebanese">فصحى + نكهة لبنانية 😎</option>
                <option value="fusha">فصحى فقط</option>
              </select>
            </label>
          </div>
        </section>

        <button type="button" className="btn-primary w-full text-xl" onClick={start}>
          🚀 استعدوا... ابدأ اللعبة!
        </button>
      </motion.div>
    </main>
  );
}
