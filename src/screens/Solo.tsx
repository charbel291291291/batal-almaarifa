import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { CategoryId, Question } from '../types';
import { CATEGORY_LABELS } from '../types';
import { QUESTION_BANK } from '../data/questions';
import { pickQuestions } from '../lib/questionPicker';
import { isAnswerCorrect } from '../lib/answerNormalizer';
import { loadSoloBest, saveSoloBest } from '../lib/prefs';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerPanel } from '../components/AnswerPanel';
import { TimerRing } from '../components/TimerRing';
import { MuteButton } from '../components/MuteButton';
import { sounds } from '../lib/soundEngine';

const SPRINT_SECONDS = 60;
const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryId[];

type Stage = 'pick' | 'play' | 'done';

/** التدريب الفردي — سباق الـ 60 ثانية: أجب على أكبر عدد ممكن */
export function Solo() {
  const goHome = useGameStore((s) => s.goHome);

  const [stage, setStage] = useState<Stage>('pick');
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const runId = useRef(0);
  const bestSaved = useRef(false);

  const start = () => {
    const picked = pickQuestions(QUESTION_BANK, {
      categories: category === 'all' ? ALL_CATEGORIES : [category],
      difficulties: ['easy', 'medium', 'hard', 'expert'],
      count: 40,
      excludeIds: [],
      requireDistractors: true,
    });
    runId.current += 1;
    bestSaved.current = false;
    setQuestions(picked);
    setIndex(0);
    setScore(0);
    setCorrect(0);
    setWrong(0);
    setFlash(null);
    setIsNewBest(false);
    setStage('play');
    sounds.roundStart();
  };

  const finish = (finalScore: number) => {
    if (!bestSaved.current) {
      bestSaved.current = true;
      setIsNewBest(saveSoloBest(finalScore));
    }
    setStage('done');
  };

  const question = questions[index];

  const answer = (value: string, elapsedMs: number) => {
    if (!question) return;
    const ok = isAnswerCorrect(value, question.answer, question.accepted_answers);
    const newScore = ok ? score + 10 + (elapsedMs <= 3000 ? 5 : 0) : score;
    if (ok) {
      setScore(newScore);
      setCorrect((c) => c + 1);
      sounds.correct();
      setFlash('correct');
    } else {
      setWrong((w) => w + 1);
      sounds.wrong();
      setFlash('wrong');
    }
    setTimeout(() => {
      setFlash(null);
      setIndex((i) => (i + 1 < questions.length ? i + 1 : i));
      if (index + 1 >= questions.length) finish(newScore);
    }, 450);
  };

  const accuracy = useMemo(() => {
    const total = correct + wrong;
    return total === 0 ? 0 : Math.round((correct / total) * 100);
  }, [correct, wrong]);

  return (
    <main className="relative z-10 mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-4 px-4 py-5">
      <header className="flex items-center justify-between">
        <button type="button" className="btn-ghost !min-h-11 !px-3 !py-2 text-sm" onClick={goHome}>
          → رجوع
        </button>
        <h1 className="text-xl font-black text-gold-2">⚡ سباق الـ 60 ثانية</h1>
        <MuteButton />
      </header>

      {stage === 'pick' && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col items-center justify-center gap-6 text-center"
        >
          <p className="max-w-sm text-lg text-ink-dim">
            اختر فئة وأجب على أكبر عدد من الأسئلة خلال 60 ثانية.
            <br />
            كل إجابة صحيحة = 10 نقاط، والسرعة تزيدها +5.
          </p>
          <div className="flex max-w-lg flex-wrap justify-center gap-2">
            <button type="button" className="chip" data-active={category === 'all'} onClick={() => setCategory('all')}>
              كل الفئات 🎲
            </button>
            {ALL_CATEGORIES.map((c) => (
              <button key={c} type="button" className="chip" data-active={category === c} onClick={() => setCategory(c)}>
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <button type="button" className="btn-primary w-full max-w-xs text-xl" onClick={start}>
            🏁 انطلق!
          </button>
        </motion.section>
      )}

      {stage === 'play' && question && (
        <section className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="glass px-4 py-2">
              <p className="text-xs text-ink-dim">النقاط</p>
              <p className="text-2xl font-black text-gold-2 tabular-nums">{score}</p>
            </div>
            <TimerRing
              duration={SPRINT_SECONDS}
              resetKey={runId.current}
              running
              onTimeout={() => finish(score)}
            />
            <div className="glass px-4 py-2 text-center">
              <p className="text-xs text-ink-dim">صح / خطأ</p>
              <p className="text-lg font-black tabular-nums">
                <span className="text-emerald">{correct}</span> / <span className="text-danger">{wrong}</span>
              </p>
            </div>
          </div>

          <div className={flash === 'wrong' ? 'animate-shake' : ''}>
            <QuestionCard question={question}>
              <AnswerPanel key={question.id} question={question} forceOptions disabled={flash !== null} onSubmit={answer} />
            </QuestionCard>
          </div>
        </section>
      )}

      {stage === 'done' && (
        <motion.section
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
        >
          <span className="text-6xl" aria-hidden>⏱️</span>
          <h2 className="text-3xl font-black">انتهى الوقت!</h2>
          {isNewBest ? (
            <p className="chip !py-2 text-base" data-active="true">🎉 رقم قياسي جديد على هذا الجهاز!</p>
          ) : (
            <p className="text-sm text-ink-dim">أفضل نتيجة على هذا الجهاز: {loadSoloBest()}</p>
          )}
          <div className="grid w-full max-w-sm grid-cols-3 gap-3">
            <div className="glass p-4">
              <p className="text-2xl font-black text-gold-2 tabular-nums">{score}</p>
              <p className="text-xs text-ink-dim">النقاط</p>
            </div>
            <div className="glass p-4">
              <p className="text-2xl font-black text-emerald tabular-nums">{correct}</p>
              <p className="text-xs text-ink-dim">صحيحة</p>
            </div>
            <div className="glass p-4">
              <p className="text-2xl font-black text-electric tabular-nums">{accuracy}%</p>
              <p className="text-xs text-ink-dim">الدقة</p>
            </div>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <button type="button" className="btn-primary text-lg" onClick={() => setStage('pick')}>
              🔁 جولة جديدة
            </button>
            <button type="button" className="btn-ghost text-lg" onClick={goHome}>
              🏠 الرئيسية
            </button>
          </div>
        </motion.section>
      )}
    </main>
  );
}
