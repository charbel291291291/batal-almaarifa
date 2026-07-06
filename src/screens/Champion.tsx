import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { masteredDifficulty, rankPlayers } from '../lib/scoreEngine';
import { difficultyLabel } from '../lib/i18n';
import { useI18n } from '../lib/useI18n';
import { Confetti } from '../components/Confetti';
import { Scoreboard } from '../components/Scoreboard';
import { sounds } from '../lib/soundEngine';

/** شاشة البطل — احتفال، إحصاءات، وبطاقة مشاركة */
export function Champion() {
  const { locale, t } = useI18n();
  const { game, goHome, goSetup } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    sounds.fanfare();
  }, []);

  if (!game) return null;
  const ranked = rankPlayers(game.players);
  const winner = game.players.find((p) => p.id === game.finalWinnerId) ?? ranked[0];
  const mastered = masteredDifficulty(winner);

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1000;
    const H = 1000;
    canvas.width = W;
    canvas.height = H;

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#14205a');
    bg.addColorStop(1, '#070b1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#e8b84b';
    ctx.lineWidth = 10;
    ctx.strokeRect(30, 30, W - 60, H - 60);

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';

    ctx.fillStyle = '#f5ce6e';
    ctx.font = '900 90px Cairo, sans-serif';
    ctx.fillText(t('championCardTitle'), W / 2, 180);

    ctx.font = '400 140px serif';
    ctx.fillText(winner.avatar, W / 2, 380);

    ctx.fillStyle = '#eef2ff';
    ctx.font = '900 100px Cairo, sans-serif';
    ctx.fillText(winner.name, W / 2, 530);

    ctx.fillStyle = '#e8b84b';
    ctx.font = '900 120px Cairo, sans-serif';
    ctx.fillText(t('pointUnit', { count: winner.score }), W / 2, 680);

    ctx.fillStyle = '#9aa6d0';
    ctx.font = '700 42px Cairo, sans-serif';
    const fastest = winner.fastestAnswerMs !== null ? `${(winner.fastestAnswerMs / 1000).toFixed(1)} ${t('secondsShort')}` : '—';
    ctx.fillText(
      `✅ ${winner.correctCount}   ⚡ ${t('fastestAnswer')} ${fastest}   🔗 ${winner.bestStreak}${mastered ? `   🎓 ${difficultyLabel(mastered, locale)}` : ''}`,
      W / 2,
      790,
    );

    ctx.fillStyle = '#4e9bff';
    ctx.font = '700 40px Cairo, sans-serif';
    ctx.fillText(t('championCardBrand'), W / 2, 900);

    const link = document.createElement('a');
    link.download = `batal-almaarifa-${winner.name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const fastestSec =
    winner.fastestAnswerMs !== null ? `${(winner.fastestAnswerMs / 1000).toFixed(1)} ${t('secondsShort')}` : '—';

  return (
    <main className="relative z-10 mx-auto flex min-h-svh w-full max-w-xl flex-col items-center gap-6 px-5 py-10 text-center">
      <Confetti />
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="flex flex-col items-center gap-3"
      >
        <span className="text-7xl" aria-hidden>👑</span>
        <h1 className="bg-gradient-to-b from-gold-2 to-gold bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
          {t('championTitle')}
        </h1>
        <div className="glass animate-glow flex flex-col items-center gap-2 border-gold/60 px-10 py-6">
          <span className="text-6xl" aria-hidden>{winner.avatar}</span>
          <h2 className="text-3xl font-black">{winner.name}</h2>
          <p className="text-xl font-bold text-gold-2">{t('championName')}</p>
        </div>
      </motion.div>

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-5" aria-label={t('championStats')}>
        {[
          { label: t('points'), value: String(winner.score), icon: '⭐' },
          { label: t('correctAnswers'), value: String(winner.correctCount), icon: '✅' },
          { label: t('fastestAnswer'), value: fastestSec, icon: '⚡' },
          { label: t('bestStreak'), value: String(winner.bestStreak), icon: '🔗' },
          { label: t('masteredLevel'), value: mastered ? difficultyLabel(mastered, locale) : '—', icon: '🎓' },
        ].map((s) => (
          <div key={s.label} className="glass flex flex-col items-center gap-1 p-4">
            <span className="text-2xl" aria-hidden>{s.icon}</span>
            <span className="text-xl font-black text-gold-2 tabular-nums">{s.value}</span>
            <span className="text-center text-xs text-ink-dim">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="w-full">
        <h3 className="mb-3 text-xl font-bold text-ink-dim">{t('finalRanking')}</h3>
        <Scoreboard players={game.players} />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <button type="button" className="btn-primary text-lg" onClick={downloadCard}>
          {t('downloadCard')}
        </button>
        <button type="button" className="btn-ghost text-lg" onClick={goSetup}>
          {t('playAgain')}
        </button>
        <button type="button" className="btn-ghost text-lg" onClick={goHome}>
          {t('home')}
        </button>
      </div>
    </main>
  );
}
