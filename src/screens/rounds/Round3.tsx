import { motion } from 'framer-motion';
import type { Phase } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { QuestionCard } from '../../components/QuestionCard';
import { AnswerPanel } from '../../components/AnswerPanel';
import { TimerRing } from '../../components/TimerRing';
import { FeedbackCard } from './FeedbackCard';
import { useI18n } from '../../lib/useI18n';
import { chainStepValue } from '../../lib/scoreEngine';

type R3Phase = Extract<Phase, { kind: 'r3' }>;

/** الجولة 3: السلسلة الذهبية — ابنِ سلسلتك أو ثبّت نقاطك */
export function Round3({ phase }: { phase: R3Phase }) {
  const { locale, t } = useI18n();
  const { game, dispatch } = useGameStore();
  if (!game) return null;

  const playerId = phase.playerOrder[phase.turnIndex];
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return null;

  if (phase.stage === 'turn-intro') {
    return (
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex w-full max-w-lg flex-col items-center gap-5 text-center"
      >
        <span className="chip" data-active="true">
          {t('turnProgress', { current: phase.turnIndex + 1, total: phase.playerOrder.length })}
        </span>
        <div className="text-6xl" aria-hidden>{player.avatar}</div>
        <h2 className="text-3xl font-black">
          {t('yourTurn', { name: player.name })}
        </h2>
        <div className="glass flex w-full items-center justify-center gap-2 p-4" aria-label={t('chainValues')}>
          {phase.chain.map((_, i) => (
            <span key={i} className="chip !min-h-0 !py-1 font-black" data-active="true">
              {chainStepValue(i)}
            </span>
          ))}
        </div>
        <p className="text-ink-dim">
          {t('chainIntro')}
          <br />
          {t('chainBankReminder')}
        </p>
        <button type="button" className="btn-primary w-full max-w-xs text-xl" onClick={() => dispatch({ type: 'ADVANCE' })}>
          {t('startChain')}
        </button>
      </motion.section>
    );
  }

  if (phase.stage === 'feedback' && phase.lastResult) {
    return <FeedbackCard result={phase.lastResult} players={game.players} autoAdvanceMs={1800} />;
  }

  if (phase.stage === 'turn-end') {
    return (
      <motion.section
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto flex w-full max-w-lg flex-col items-center gap-5 text-center"
      >
        <div className="text-5xl" aria-hidden>
          {phase.lastResult?.correct ? '🌟' : '💔'}
        </div>
        <h2 className="text-2xl font-black">{locale === 'ar' ? phase.turnSummary : t('turnComplete')}</h2>
        {phase.lastResult && !phase.lastResult.correct && (
          <p className="text-lg">
            {t('correctAnswerWas')} <span className="font-black text-gold-2">{phase.lastResult.correctAnswer}</span>
          </p>
        )}
        <button type="button" className="btn-primary w-full max-w-xs text-xl" onClick={() => dispatch({ type: 'ADVANCE' })}>
          {phase.turnIndex + 1 >= phase.playerOrder.length ? t('results') : t('nextPlayer')}
        </button>
      </motion.section>
    );
  }

  // stage === 'question'
  const question = phase.chain[phase.chainIndex];
  if (!question) return null;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="glass flex items-center gap-3 px-4 py-2">
          <span className="text-3xl" aria-hidden>{player.avatar}</span>
          <div>
            <p className="text-xs text-ink-dim">{t('chain')}</p>
            <p className="text-lg font-black text-gold-2">{player.name}</p>
          </div>
        </div>
        <TimerRing
          duration={Math.round(question.time_limit_seconds * game.settings.timerSpeed)}
          resetKey={`${question.id}-${phase.chainIndex}`}
          running
          onTimeout={() => dispatch({ type: 'TIMEOUT' })}
        />
      </div>

      {/* تقدم السلسلة */}
      <div className="flex items-center justify-center gap-2" aria-label={t('chainProgress')}>
        {phase.chain.map((_, i) => (
          <span
            key={i}
            className={`chip !min-h-0 !py-1 font-black ${i === phase.chainIndex ? 'animate-glow' : ''}`}
            data-active={i <= phase.chainIndex}
          >
            {chainStepValue(i)}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold">
          {t('chainPot', { points: phase.pot })}
        </p>
        <button
          type="button"
          className="btn-ghost !min-h-11 !py-2 border-gold/50 text-gold-2 disabled:opacity-40"
          disabled={phase.banked || phase.pot <= 0}
          onClick={() => dispatch({ type: 'BANK' })}
          title={phase.banked ? t('bankUsedTitle') : t('bankNowTitle')}
        >
          {phase.banked ? t('banked') : t('bankPoints')}
        </button>
      </div>

      <QuestionCard question={question}>
        <AnswerPanel
          key={`${question.id}-${phase.chainIndex}`}
          question={question}
          forceOptions={game.settings.answerMode === 'options'}
          onSubmit={(value, elapsedMs) => dispatch({ type: 'ANSWER', value, elapsedMs })}
        />
      </QuestionCard>
    </section>
  );
}
