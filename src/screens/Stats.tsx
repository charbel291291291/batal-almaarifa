import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { clearDeviceStats, loadDeviceStats, loadSoloBest } from '../lib/prefs';
import { ConfirmModal } from '../components/ConfirmModal';

/** إحصاءات الجهاز — الألعاب المنتهية، الأبطال، أفضل نتيجة فردية */
export function Stats() {
  const goHome = useGameStore((s) => s.goHome);
  const [stats, setStats] = useState(loadDeviceStats());
  const [confirmClear, setConfirmClear] = useState(false);
  const soloBest = loadSoloBest();

  const total = stats.totalCorrect + stats.totalWrong;
  const accuracy = total === 0 ? 0 : Math.round((stats.totalCorrect / total) * 100);

  return (
    <main className="relative z-10 mx-auto w-full max-w-xl px-5 py-8">
      {confirmClear && (
        <ConfirmModal
          title="مسح إحصاءات الجهاز؟"
          message="سيُحذف سجل الألعاب والأبطال من هذا الجهاز."
          confirmLabel="نعم، امسح"
          onConfirm={() => {
            clearDeviceStats();
            setStats(loadDeviceStats());
            setConfirmClear(false);
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-black text-gold-2">📊 الإحصاءات</h1>
          <button type="button" className="btn-ghost !min-h-11 !py-2" onClick={goHome}>
            → رجوع
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'ألعاب مكتملة', value: String(stats.gamesPlayed), icon: '🎮' },
            { label: 'إجابات صحيحة', value: String(stats.totalCorrect), icon: '✅' },
            { label: 'الدقة', value: `${accuracy}%`, icon: '🎯' },
            { label: 'أفضل سباق 60ث', value: String(soloBest), icon: '⚡' },
          ].map((s) => (
            <div key={s.label} className="glass flex flex-col items-center gap-1 p-4">
              <span className="text-2xl" aria-hidden>{s.icon}</span>
              <span className="text-2xl font-black text-gold-2 tabular-nums">{s.value}</span>
              <span className="text-center text-xs text-ink-dim">{s.label}</span>
            </div>
          ))}
        </div>

        <section className="glass p-5">
          <h2 className="mb-4 text-xl font-bold">🏆 سجل الأبطال</h2>
          {stats.champions.length === 0 ? (
            <p className="text-center text-ink-dim">لا أبطال بعد — أكملوا أول مسابقة!</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {stats.champions.map((c, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2">
                  <span className="text-2xl" aria-hidden>{c.avatar}</span>
                  <span className="flex-1 font-bold">{c.name}</span>
                  <span className="font-black text-gold-2 tabular-nums">{c.score}</span>
                  <span className="text-xs text-ink-dim">{c.date}</span>
                </li>
              ))}
            </ol>
          )}
          {stats.gamesPlayed > 0 && (
            <button type="button" className="chip mt-4 text-danger" onClick={() => setConfirmClear(true)}>
              🗑️ مسح الإحصاءات
            </button>
          )}
        </section>
      </motion.div>
    </main>
  );
}
