import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { masteredDifficulty, rankPlayers } from '../lib/scoreEngine';
import { DIFFICULTY_LABELS } from '../types';
import { Confetti } from '../components/Confetti';
import { Scoreboard } from '../components/Scoreboard';
import { sounds } from '../lib/soundEngine';

/** شاشة البطل — احتفال، إحصاءات، وبطاقة مشاركة */
export function Champion() {
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
    ctx.fillText('🏆 بطل المعرفة 🏆', W / 2, 180);

    ctx.font = '400 140px serif';
    ctx.fillText(winner.avatar, W / 2, 380);

    ctx.fillStyle = '#eef2ff';
    ctx.font = '900 100px Cairo, sans-serif';
    ctx.fillText(winner.name, W / 2, 530);

    ctx.fillStyle = '#e8b84b';
    ctx.font = '900 120px Cairo, sans-serif';
    ctx.fillText(`${winner.score} نقطة`, W / 2, 680);

    ctx.fillStyle = '#9aa6d0';
    ctx.font = '700 42px Cairo, sans-serif';
    const fastest = winner.fastestAnswerMs !== null ? `${(winner.fastestAnswerMs / 1000).toFixed(1)} ث` : '—';
    ctx.fillText(
      `✅ ${winner.correctCount} صحيحة   ⚡ أسرع إجابة ${fastest}   🔗 سلسلة ${winner.bestStreak}${mastered ? `   🎓 ${DIFFICULTY_LABELS[mastered]}` : ''}`,
      W / 2,
      790,
    );

    ctx.fillStyle = '#4e9bff';
    ctx.font = '700 40px Cairo, sans-serif';
    ctx.fillText('مسابقة بطل المعرفة', W / 2, 900);

    const link = document.createElement('a');
    link.download = `batal-almaarifa-${winner.name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const fastestSec =
    winner.fastestAnswerMs !== null ? `${(winner.fastestAnswerMs / 1000).toFixed(1)} ث` : '—';

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
          لدينا بطل جديد!
        </h1>
        <div className="glass animate-glow flex flex-col items-center gap-2 border-gold/60 px-10 py-6">
          <span className="text-6xl" aria-hidden>{winner.avatar}</span>
          <h2 className="text-3xl font-black">{winner.name}</h2>
          <p className="text-xl font-bold text-gold-2">بطل المعرفة 🏆</p>
        </div>
      </motion.div>

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-5" aria-label="إحصاءات البطل">
        {[
          { label: 'النقاط', value: String(winner.score), icon: '⭐' },
          { label: 'إجابات صحيحة', value: String(winner.correctCount), icon: '✅' },
          { label: 'أسرع إجابة', value: fastestSec, icon: '⚡' },
          { label: 'أفضل سلسلة', value: String(winner.bestStreak), icon: '🔗' },
          { label: 'المستوى المتقن', value: mastered ? DIFFICULTY_LABELS[mastered] : '—', icon: '🎓' },
        ].map((s) => (
          <div key={s.label} className="glass flex flex-col items-center gap-1 p-4">
            <span className="text-2xl" aria-hidden>{s.icon}</span>
            <span className="text-xl font-black text-gold-2 tabular-nums">{s.value}</span>
            <span className="text-center text-xs text-ink-dim">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="w-full">
        <h3 className="mb-3 text-xl font-bold text-ink-dim">الترتيب النهائي</h3>
        <Scoreboard players={game.players} />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <button type="button" className="btn-primary text-lg" onClick={downloadCard}>
          📸 حمّل بطاقة البطل
        </button>
        <button type="button" className="btn-ghost text-lg" onClick={goSetup}>
          🔁 العب من جديد
        </button>
        <button type="button" className="btn-ghost text-lg" onClick={goHome}>
          🏠 الشاشة الرئيسية
        </button>
      </div>
    </main>
  );
}
