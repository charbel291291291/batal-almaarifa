import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { ROUNDS } from '../types';
import { Scoreboard } from '../components/Scoreboard';
import { MuteButton } from '../components/MuteButton';
import { ConfirmModal } from '../components/ConfirmModal';
import { RoundIntro } from './rounds/RoundIntro';
import { Round1 } from './rounds/Round1';
import { Round2 } from './rounds/Round2';
import { Round3 } from './rounds/Round3';
import { Round4 } from './rounds/Round4';
import { Round5 } from './rounds/Round5';
import { Results } from './rounds/Results';
import { Champion } from './Champion';
import { roundLabel } from '../lib/i18n';
import { useI18n } from '../lib/useI18n';

/** شاشة اللعب الرئيسية — توزّع العرض بحسب مرحلة المحرك */
export function Game() {
  const { game, goHome } = useGameStore();
  const { locale, t } = useI18n();
  const [confirmExit, setConfirmExit] = useState(false);
  if (!game) return null;

  const { phase } = game;

  if (phase.kind === 'champion') return <Champion />;

  const roundId =
    phase.kind === 'intro' ? phase.round : phase.kind === 'results' ? phase.roundJustEnded : phase.kind;
  const roundMeta = ROUNDS.find((r) => r.id === roundId);

  const activePlayerId =
    phase.kind === 'r1'
      ? phase.queue[phase.index]?.playerId
      : phase.kind === 'r3'
        ? phase.playerOrder[phase.turnIndex]
        : phase.kind === 'r2' || phase.kind === 'r4'
          ? phase.buzzedPlayerId
          : phase.kind === 'r5'
            ? (phase.stealerId ?? phase.finalists[phase.questionCount % 2])
            : null;

  return (
    <main className="relative z-10 mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-4 px-4 py-5">
      {confirmExit && (
        <ConfirmModal
          title={t('endGameTitle')}
          message={t('endGameMessage')}
          confirmLabel={t('confirmEnd')}
          cancelLabel={t('keepPlaying')}
          onConfirm={goHome}
          onCancel={() => setConfirmExit(false)}
        />
      )}

      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="btn-ghost !min-h-11 !px-3 !py-2 text-sm"
          onClick={() => setConfirmExit(true)}
        >
          {t('endGame')}
        </button>
        {roundMeta && (
          <h1 className="text-lg font-black text-gold-2 sm:text-xl">🎬 {roundLabel(roundMeta.id, locale)}</h1>
        )}
        <MuteButton />
      </header>

      {phase.kind !== 'results' && (
        <Scoreboard players={game.players} compact activePlayerId={activePlayerId} />
      )}

      <div className="flex flex-1 flex-col justify-center py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${phase.kind}-${'stage' in phase ? phase.stage : ''}-${'index' in phase ? phase.index : ''}-${'turnIndex' in phase ? phase.turnIndex : ''}-${'questionCount' in phase ? phase.questionCount : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {phase.kind === 'intro' && <RoundIntro round={phase.round} />}
            {phase.kind === 'r1' && <Round1 phase={phase} />}
            {phase.kind === 'r2' && <Round2 phase={phase} />}
            {phase.kind === 'r3' && <Round3 phase={phase} />}
            {phase.kind === 'r4' && <Round4 phase={phase} />}
            {phase.kind === 'r5' && <Round5 phase={phase} />}
            {phase.kind === 'results' && <Results roundJustEnded={phase.roundJustEnded} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
