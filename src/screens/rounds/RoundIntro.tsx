import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { RoundId } from '../../types';
import { ROUNDS } from '../../types';
import { sounds } from '../../lib/soundEngine';
import { useGameStore } from '../../store/gameStore';

const ROUND_ICONS: Record<RoundId, string> = { r1: '🚀', r2: '🔔', r3: '🔗', r4: '⚔️', r5: '👑' };

export function RoundIntro({ round }: { round: RoundId }) {
  const dispatch = useGameStore((s) => s.dispatch);
  const meta = ROUNDS.find((r) => r.id === round)!;
  const number = ROUNDS.findIndex((r) => r.id === round) + 1;

  useEffect(() => {
    sounds.roundStart();
  }, [round]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-lg flex-col items-center gap-5 text-center"
    >
      <span className="chip" data-active="true">الجولة {number} من {ROUNDS.length}</span>
      <div className="text-6xl" aria-hidden>{ROUND_ICONS[round]}</div>
      <h2 className="bg-gradient-to-b from-gold-2 to-gold bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
        {meta.title}
      </h2>
      <p className="text-lg text-ink-dim">{meta.subtitle}</p>

      <ul className="glass w-full space-y-2 p-5 text-start">
        {meta.rules.map((rule, i) => (
          <li key={i} className="flex gap-2 text-base font-semibold">
            <span className="text-gold-2" aria-hidden>◆</span>
            {rule}
          </li>
        ))}
      </ul>

      <button type="button" className="btn-primary w-full max-w-xs text-xl" onClick={() => dispatch({ type: 'ADVANCE' })}>
        استعدوا... ابدأ! 🎬
      </button>
    </motion.section>
  );
}
