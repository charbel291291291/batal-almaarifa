import type { Phase } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { QuestionCard } from '../../components/QuestionCard';
import { AnswerPanel } from '../../components/AnswerPanel';
import { TimerRing } from '../../components/TimerRing';
import { FeedbackCard } from './FeedbackCard';
import { useI18n } from '../../lib/useI18n';

type R1Phase = Extract<Phase, { kind: 'r1' }>;

/** الجولة 1: الانطلاقة — كل لاعب يجيب بالدور، السرعة تكافأ */
export function Round1({ phase }: { phase: R1Phase }) {
  const { t } = useI18n();
  const { game, dispatch } = useGameStore();
  if (!game) return null;

  if (phase.stage === 'feedback' && phase.lastResult) {
    return <FeedbackCard result={phase.lastResult} players={game.players} />;
  }

  const item = phase.queue[phase.index];
  if (!item) return null;
  const player = game.players.find((p) => p.id === item.playerId)!;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="glass flex items-center gap-3 px-4 py-2">
          <span className="text-3xl" aria-hidden>{player.avatar}</span>
          <div>
            <p className="text-xs text-ink-dim">{t('nextFor')}</p>
            <p className="text-lg font-black text-gold-2">{player.name}</p>
          </div>
        </div>
        <span className="chip !min-h-0 !py-1">
          {t('questionNumber', { current: phase.index + 1, total: phase.queue.length })}
        </span>
        <TimerRing
          duration={Math.round(item.question.time_limit_seconds * game.settings.timerSpeed)}
          resetKey={`${item.question.id}-${phase.index}`}
          running
          onTimeout={() => dispatch({ type: 'TIMEOUT' })}
        />
      </div>

      <QuestionCard question={item.question}>
        <AnswerPanel
          key={item.question.id}
          question={item.question}
          forceOptions={game.settings.answerMode === 'options'}
          onSubmit={(value, elapsedMs) => dispatch({ type: 'ANSWER', value, elapsedMs })}
        />
      </QuestionCard>

      <p className="text-center text-sm text-ink-dim">{t('speedBonusHint')}</p>
    </section>
  );
}
