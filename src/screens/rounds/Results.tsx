import { motion } from 'framer-motion';
import type { RoundId } from '../../types';
import { ROUNDS } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { Scoreboard } from '../../components/Scoreboard';

export function Results({ roundJustEnded }: { roundJustEnded: RoundId }) {
  const { game, dispatch } = useGameStore();
  if (!game) return null;

  const meta = ROUNDS.find((r) => r.id === roundJustEnded)!;
  const isLast = roundJustEnded === 'r5';

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-lg flex-col items-center gap-5"
    >
      <span className="chip" data-active="true">انتهت جولة «{meta.title}»</span>
      <h2 className="text-3xl font-black text-gold-2">لوحة النتائج 📊</h2>
      <Scoreboard players={game.players} />
      <button type="button" className="btn-primary w-full max-w-xs text-xl" onClick={() => dispatch({ type: 'ADVANCE' })}>
        {isLast ? '🏆 لدينا بطل جديد!' : 'الجولة التالية ←'}
      </button>
    </motion.section>
  );
}
