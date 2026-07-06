import { motion } from 'framer-motion';
import type { Phase } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { QuestionCard } from '../../components/QuestionCard';
import { AnswerPanel } from '../../components/AnswerPanel';
import { TimerRing } from '../../components/TimerRing';
import { FeedbackCard } from './FeedbackCard';
import { SCORING } from '../../lib/scoreEngine';
import { categoryLabel } from '../../lib/i18n';
import { useI18n } from '../../lib/useI18n';

type R5Phase = Extract<Phase, { kind: 'r5' }>;

/** الجولة 5: النهائي — اختيار الفئات، سباق إلى 100، وخطف الفرص */
export function Round5({ phase }: { phase: R5Phase }) {
  const { locale, t } = useI18n();
  const { game, dispatch } = useGameStore();
  if (!game) return null;

  const speed = game.settings.timerSpeed;
  const [fa, fb] = phase.finalists;
  const pa = game.players.find((p) => p.id === fa)!;
  const pb = game.players.find((p) => p.id === fb)!;

  if (phase.stage === 'category-pick') {
    const pickerId = phase.pickTurn < 2 ? fa : fb;
    const picker = game.players.find((p) => p.id === pickerId)!;
    const forSelf = phase.pickTurn % 2 === 0;

    return (
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex w-full max-w-lg flex-col items-center gap-5 text-center"
      >
        <span className="chip" data-active="true">{t('categoryPick', { current: phase.pickTurn + 1 })}</span>
        <div className="text-5xl" aria-hidden>{picker.avatar}</div>
        <h2 className="text-2xl font-black">
          <span className="text-gold-2">{picker.name}</span>…
          {forSelf ? t('chooseStrength') : t('chooseTrap')}
        </h2>
        <p className="text-sm text-ink-dim">
          {forSelf
            ? t('strengthHelp')
            : t('trapHelp')}
        </p>
        <div className="flex w-full flex-col gap-3" role="group" aria-label={t('offeredCategories')}>
          {phase.offered.map((c) => (
            <button
              key={c}
              type="button"
              className="option-btn"
              onClick={() => dispatch({ type: 'PICK_CATEGORY', category: c })}
            >
              {categoryLabel(c, locale)}
            </button>
          ))}
        </div>
      </motion.section>
    );
  }

  if (phase.stage === 'done') {
    return (
      <motion.section
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto flex w-full max-w-lg flex-col items-center gap-5 text-center"
      >
        <span className="text-6xl" aria-hidden>👑</span>
        <h2 className="text-2xl font-black">{locale === 'ar' ? phase.doneSummary : t('finalComplete')}</h2>
        <RaceBars pa={pa} pb={pb} finalScores={phase.finalScores} />
        <button type="button" className="btn-primary w-full max-w-xs text-xl" onClick={() => dispatch({ type: 'ADVANCE' })}>
          {t('announceChampion')}
        </button>
      </motion.section>
    );
  }

  if (phase.stage === 'feedback' && phase.lastResult) {
    return (
      <div className="flex flex-col items-center gap-4">
        <RaceBars pa={pa} pb={pb} finalScores={phase.finalScores} />
        <FeedbackCard result={phase.lastResult} players={game.players} />
      </div>
    );
  }

  const question = phase.question;
  if (!question) return null;

  const isSteal = phase.stage === 'steal';
  const answererId = isSteal ? phase.stealerId! : phase.finalists[phase.questionCount % 2];
  const answerer = game.players.find((p) => p.id === answererId)!;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <RaceBars pa={pa} pb={pb} finalScores={phase.finalScores} />

      <div className="flex items-center justify-between gap-3">
        <div className={`glass flex items-center gap-3 px-4 py-2 ${isSteal ? 'border-gold/60' : ''}`}>
          <span className="text-3xl" aria-hidden>{answerer.avatar}</span>
          <div>
            <p className="text-xs text-ink-dim">{isSteal ? t('chanceMoved') : t('finalQuestionFor')}</p>
            <p className="text-lg font-black text-gold-2">{answerer.name}</p>
          </div>
        </div>
        <span className="chip !min-h-0 !py-1">
          {isSteal ? t('stealPoints', { points: SCORING.r5.steal }) : t('finalPoints', { points: SCORING.r5.correct })}
        </span>
        <TimerRing
          duration={
            isSteal
              ? SCORING.r5.answerWindowSeconds
              : Math.round(question.time_limit_seconds * speed)
          }
          resetKey={`${question.id}-${phase.stage}-${answererId}`}
          running
          onTimeout={() => dispatch({ type: 'TIMEOUT' })}
        />
      </div>

      <QuestionCard question={question}>
        <AnswerPanel
          key={`${question.id}-${phase.stage}-${answererId}`}
          question={question}
          forceOptions={isSteal || game.settings.answerMode === 'options'}
          onSubmit={(value, elapsedMs) => dispatch({ type: 'ANSWER', value, elapsedMs })}
        />
      </QuestionCard>

      <p className="text-center text-sm text-ink-dim">
        {t('finalRule', { target: SCORING.r5.target })}
      </p>
    </section>
  );
}

function RaceBars({
  pa,
  pb,
  finalScores,
}: {
  pa: { id: string; name: string; avatar: string };
  pb: { id: string; name: string; avatar: string };
  finalScores: Record<string, number>;
}) {
  const { t } = useI18n();
  const target = SCORING.r5.target;
  return (
    <div className="glass flex w-full flex-col gap-2 p-4" aria-label={t('finalRace')}>
      {[pa, pb].map((p) => {
        const value = finalScores[p.id] ?? 0;
        const pct = Math.min(100, (value / target) * 100);
        return (
          <div key={p.id} className="flex items-center gap-2">
            <span className="w-8 text-center text-xl" aria-hidden>{p.avatar}</span>
            <span className="w-20 truncate text-sm font-bold">{p.name}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar"
              aria-valuenow={value} aria-valuemin={0} aria-valuemax={target} aria-label={t('finalScoreFor', { name: p.name })}>
              <div
                className="h-full rounded-full bg-gradient-to-l from-gold-2 to-gold transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-12 text-end text-lg font-black tabular-nums text-gold-2">{value}</span>
          </div>
        );
      })}
    </div>
  );
}
