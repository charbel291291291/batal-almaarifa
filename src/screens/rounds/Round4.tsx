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
import { useI18n } from '../../lib/useI18n';

type R4Phase = Extract<Phase, { kind: 'r4' }>;

/** الجولة 4: المواجهة — مبارزة إقصاء بين أدنى لاعبَين */
export function Round4({ phase }: { phase: R4Phase }) {
  const { locale, t } = useI18n();
  const { game, dispatch } = useGameStore();
  const question = phase.questions[phase.index];

  // جرس المتواجهين من لوحة المفاتيح
  useEffect(() => {
    if (phase.stage !== 'buzz' || !game) return;
    const onKey = (e: KeyboardEvent) => {
      const player = game.players.find((p) => p.buzzKey === e.key);
      if (player && phase.duelists.includes(player.id) && !phase.lockedOut.includes(player.id)) {
        sounds.buzz();
        dispatch({ type: 'BUZZ', playerId: player.id });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase.stage, phase.lockedOut, phase.duelists, game, dispatch]);

  if (!game) return null;
  const speed = game.settings.timerSpeed;
  const [a, b] = phase.duelists;
  const pa = game.players.find((p) => p.id === a)!;
  const pb = game.players.find((p) => p.id === b)!;

  if (phase.stage === 'duel-intro') {
    return (
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 text-center"
      >
        <span className="chip" data-active="true">{t('showdown')}</span>
        <div className="flex w-full items-center justify-center gap-4">
          <div className="glass flex flex-1 flex-col items-center gap-2 p-5">
            <span className="text-5xl" aria-hidden>{pa.avatar}</span>
            <span className="text-xl font-black">{pa.name}</span>
            <span className="text-sm text-ink-dim">{t('pointUnit', { count: pa.score })}</span>
          </div>
          <span className="text-3xl font-black text-danger" aria-hidden>VS</span>
          <div className="glass flex flex-1 flex-col items-center gap-2 p-5">
            <span className="text-5xl" aria-hidden>{pb.avatar}</span>
            <span className="text-xl font-black">{pb.name}</span>
            <span className="text-sm text-ink-dim">{t('pointUnit', { count: pb.score })}</span>
          </div>
        </div>
        <p className="text-ink-dim">
          {t('duelHelp', { count: SCORING.r4.duelQuestions })}
          <br />
          <b className="text-danger">{t('loserLeaves')}</b>
        </p>
        <button type="button" className="btn-primary w-full max-w-xs text-xl" onClick={() => dispatch({ type: 'ADVANCE' })}>
          {t('startShowdown')}
        </button>
      </motion.section>
    );
  }

  if (phase.stage === 'feedback' && phase.lastResult) {
    return (
      <div className="flex flex-col items-center gap-4">
        <DuelScore pa={pa} pb={pb} wins={phase.wins} suddenDeath={phase.suddenDeath} />
        <FeedbackCard result={phase.lastResult} players={game.players} />
      </div>
    );
  }

  if (phase.stage === 'duel-end') {
    const eliminated = game.players.find((p) => p.id === phase.eliminatedId);
    return (
      <motion.section
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto flex w-full max-w-lg flex-col items-center gap-5 text-center"
      >
        <span className="text-6xl" aria-hidden>🚪</span>
        <h2 className="text-2xl font-black">{locale === 'ar' ? phase.duelSummary : t('duelComplete')}</h2>
        {eliminated && (
          <div className="glass flex items-center gap-3 px-6 py-3 opacity-60">
            <span className="text-3xl" aria-hidden>{eliminated.avatar}</span>
            <span className="text-lg font-bold line-through">{eliminated.name}</span>
            <span className="chip !min-h-0 !py-1 text-xs text-danger">{t('eliminated')}</span>
          </div>
        )}
        <button type="button" className="btn-primary w-full max-w-xs text-xl" onClick={() => dispatch({ type: 'ADVANCE' })}>
          {game.players.filter((p) => !p.eliminated).length > 2 ? t('nextShowdown') : t('results')}
        </button>
      </motion.section>
    );
  }

  if (!question) return null;
  const buzzer = phase.buzzedPlayerId ? game.players.find((p) => p.id === phase.buzzedPlayerId) : null;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <DuelScore pa={pa} pb={pb} wins={phase.wins} suddenDeath={phase.suddenDeath} />
        {phase.stage === 'buzz' && (
          <TimerRing
            duration={Math.round(question.time_limit_seconds * speed)}
            resetKey={`buzz-${question.id}-${phase.lockedOut.length}`}
            running
            onTimeout={() => dispatch({ type: 'TIMEOUT' })}
            size={64}
          />
        )}
        {phase.stage === 'answering' && (
          <TimerRing
            duration={SCORING.r4.answerWindowSeconds}
            resetKey={`ans-${question.id}-${phase.buzzedPlayerId}`}
            running
            onTimeout={() => dispatch({ type: 'TIMEOUT' })}
          />
        )}
      </div>

      <QuestionCard question={question}>
        {phase.stage === 'answering' && buzzer && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-gold/50 bg-gold/10 px-4 py-2"
            >
              <span className="text-2xl" aria-hidden>{buzzer.avatar}</span>
              <span className="text-lg font-black text-gold-2">{t('fastestBuzz', { name: buzzer.name })}</span>
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

      {phase.stage === 'buzz' && (
        <div className="grid grid-cols-2 gap-3" role="group" aria-label={t('duelBuzzers')}>
          {[pa, pb].map((p) => {
            const locked = phase.lockedOut.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className="buzzer-btn flex flex-col items-center gap-1 px-2 py-4"
                disabled={locked}
                onClick={() => {
                  sounds.buzz();
                  dispatch({ type: 'BUZZ', playerId: p.id });
                }}
                aria-label={`${t('buzzer', { key: p.name })}${locked ? t('buzzerLocked') : ''}`}
              >
                <span className="text-3xl" aria-hidden>{locked ? '🔒' : p.avatar}</span>
                <span>{p.name}</span>
                <span className="text-xs text-ink-dim">{t('keyLabel', { key: p.buzzKey })}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DuelScore({
  pa,
  pb,
  wins,
  suddenDeath,
}: {
  pa: { id: string; name: string; avatar: string };
  pb: { id: string; name: string; avatar: string };
  wins: Record<string, number>;
  suddenDeath: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="glass flex items-center gap-3 px-4 py-2" aria-label={t('duelScore')}>
      <span aria-hidden>{pa.avatar}</span>
      <span className="text-xl font-black tabular-nums text-gold-2">{wins[pa.id]}</span>
      <span className="text-sm text-danger font-black">{suddenDeath ? t('suddenDeath') : 'VS'}</span>
      <span className="text-xl font-black tabular-nums text-gold-2">{wins[pb.id]}</span>
      <span aria-hidden>{pb.avatar}</span>
    </div>
  );
}
