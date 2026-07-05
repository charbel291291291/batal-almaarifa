import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Phase } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { QuestionCard } from '../../components/QuestionCard';
import { AnswerPanel } from '../../components/AnswerPanel';
import { TimerRing } from '../../components/TimerRing';
import { FeedbackCard } from './FeedbackCard';
import { sounds } from '../../lib/soundEngine';
import { SCORING } from '../../lib/scoreEngine';

type R2Phase = Extract<Phase, { kind: 'r2' }>;

const WORD_REVEAL_MS = 600;
const NO_BUZZ_GRACE_SECONDS = 8;

/** الجولة 2: من يسبق؟ — السؤال يظهر كلمة كلمة والجرس يحسم */
export function Round2({ phase }: { phase: R2Phase }) {
  const { game, dispatch } = useGameStore();
  const question = phase.questions[phase.index];
  const wordCount = question ? question.question_text.split(/\s+/).length : 0;
  const fullyRevealed = phase.wordsRevealed >= wordCount;

  // كشف الكلمات تدريجياً
  useEffect(() => {
    if (phase.stage !== 'reveal' || fullyRevealed) return;
    const t = setInterval(() => dispatch({ type: 'REVEAL_WORD' }), WORD_REVEAL_MS);
    return () => clearInterval(t);
  }, [phase.stage, fullyRevealed, phase.index, dispatch]);

  // الجرس من لوحة المفاتيح (أرقام 1-6)
  useEffect(() => {
    if (phase.stage !== 'reveal' || !game) return;
    const onKey = (e: KeyboardEvent) => {
      const player = game.players.find((p) => p.buzzKey === e.key);
      if (player && !phase.lockedOut.includes(player.id)) {
        sounds.buzz();
        dispatch({ type: 'BUZZ', playerId: player.id });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase.stage, phase.lockedOut, game, dispatch]);

  if (!game || !question) return null;

  if (phase.stage === 'feedback' && phase.lastResult) {
    return <FeedbackCard result={phase.lastResult} players={game.players} />;
  }

  const buzzer = phase.buzzedPlayerId ? game.players.find((p) => p.id === phase.buzzedPlayerId) : null;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="chip !min-h-0 !py-1">
          سؤال {phase.index + 1} / {phase.questions.length}
        </span>
        {phase.stage === 'reveal' && fullyRevealed && (
          <TimerRing
            duration={NO_BUZZ_GRACE_SECONDS}
            resetKey={`grace-${question.id}-${phase.lockedOut.length}`}
            running
            onTimeout={() => dispatch({ type: 'TIMEOUT' })}
            size={64}
          />
        )}
        {phase.stage === 'answering' && (
          <TimerRing
            duration={SCORING.r2.answerWindowSeconds}
            resetKey={`ans-${question.id}-${phase.buzzedPlayerId}`}
            running
            onTimeout={() => dispatch({ type: 'TIMEOUT' })}
          />
        )}
      </div>

      <QuestionCard
        question={question}
        visibleWords={phase.stage === 'answering' ? undefined : phase.wordsRevealed}
      >
        {phase.stage === 'answering' && buzzer && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-gold/50 bg-gold/10 px-4 py-2"
            >
              <span className="text-2xl" aria-hidden>{buzzer.avatar}</span>
              <span className="text-lg font-black text-gold-2">{buzzer.name} سبق الجميع! 🔔 أجب الآن</span>
            </motion.div>
            <AnswerPanel
              key={`${question.id}-${buzzer.id}`}
              question={question}
              forceOptions
              onSubmit={(value, elapsedMs) => dispatch({ type: 'ANSWER', value, elapsedMs })}
            />
          </>
        )}
      </QuestionCard>

      {phase.stage === 'reveal' && (
        <>
          <p className="text-center text-sm font-bold text-ink-dim" aria-live="polite">
            {fullyRevealed ? 'السؤال اكتمل... من يسبق؟ 🔔' : 'السؤال يُكشف... اضغط جرسك متى عرفت الإجابة!'}
          </p>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.min(game.players.length, 3)}, 1fr)` }}
            role="group"
            aria-label="أجراس اللاعبين"
          >
            {game.players.map((p) => {
              const locked = phase.lockedOut.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className="buzzer-btn flex flex-col items-center gap-1 px-2 py-3"
                  disabled={locked}
                  onClick={() => {
                    sounds.buzz();
                    dispatch({ type: 'BUZZ', playerId: p.id });
                  }}
                  aria-label={`جرس ${p.name}${locked ? ' — مقفل' : ''}`}
                >
                  <span className="text-2xl" aria-hidden>{locked ? '🔒' : p.avatar}</span>
                  <span className="text-sm">{p.name}</span>
                  <span className="text-xs text-ink-dim">مفتاح {p.buzzKey}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
