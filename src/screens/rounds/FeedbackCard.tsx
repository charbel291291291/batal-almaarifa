import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { AnswerResult, PlayerState } from '../../types';
import { sounds } from '../../lib/soundEngine';
import { useGameStore } from '../../store/gameStore';
import { useI18n } from '../../lib/useI18n';

interface Props {
  result: AnswerResult;
  players: PlayerState[];
  /** بالمللي ثانية — 0 يعني بلا تقدم تلقائي */
  autoAdvanceMs?: number;
  advanceLabel?: string;
}

/** بطاقة نتيجة الإجابة — تظهر بعد كل سؤال ثم تتقدم تلقائياً */
export function FeedbackCard({ result, players, autoAdvanceMs = 2600, advanceLabel }: Props) {
  const dispatch = useGameStore((s) => s.dispatch);
  const { locale, t } = useI18n();
  const player = players.find((p) => p.id === result.playerId);

  useEffect(() => {
    if (result.correct) sounds.correct();
    else sounds.wrong();
  }, [result]);

  useEffect(() => {
    if (!autoAdvanceMs) return;
    const t = setTimeout(() => dispatch({ type: 'ADVANCE' }), autoAdvanceMs);
    return () => clearTimeout(t);
  }, [autoAdvanceMs, dispatch, result]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass mx-auto w-full max-w-lg p-6 text-center ${
        result.correct ? 'border-emerald/60' : 'border-danger/60'
      }`}
      role="status"
      aria-live="assertive"
    >
      <div className="mb-2 text-5xl" aria-hidden>
        {result.correct ? '✅' : result.timedOut ? '⏱️' : '❌'}
      </div>
      <h3 className={`mb-1 text-2xl font-black ${result.correct ? 'text-emerald' : 'text-danger'}`}>
        {locale === 'ar'
          ? result.hostLine
          : result.timedOut
            ? t('feedbackTimeout')
            : result.correct
              ? t('feedbackCorrect')
              : t('feedbackWrong')}
      </h3>
      {player && (
        <p className="mb-2 text-lg text-ink-dim">
          {player.avatar} {player.name}
          {result.delta !== 0 && (
            <span className={`mx-2 font-black ${result.delta > 0 ? 'text-emerald' : 'text-danger'}`}>
              {result.delta > 0 ? `+${result.delta}` : result.delta}
            </span>
          )}
        </p>
      )}
      {!result.correct && (
        <p className="text-xl font-bold">
          {t('correctAnswerWas')} <span className="text-gold-2">{result.correctAnswer}</span>
        </p>
      )}
      {result.explanation && <p className="mt-2 text-sm text-ink-dim">💡 {result.explanation}</p>}
      <button type="button" className="btn-ghost mt-4 !min-h-11 !py-2" onClick={() => dispatch({ type: 'ADVANCE' })}>
        {advanceLabel ?? t('continue')}
      </button>
    </motion.div>
  );
}
