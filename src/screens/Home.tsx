import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { MuteButton } from '../components/MuteButton';

function Logo() {
  return (
    <svg viewBox="0 0 120 120" width="110" height="110" aria-hidden className="drop-shadow-[0_0_30px_rgba(232,184,75,0.4)]">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5ce6e" />
          <stop offset="1" stopColor="#e8b84b" />
        </linearGradient>
      </defs>
      <polygon
        points="60,6 108,33 108,87 60,114 12,87 12,33"
        fill="rgba(255,255,255,0.05)"
        stroke="url(#lg)"
        strokeWidth="4"
      />
      <path d="M60 30 L69 52 L93 54 L75 69 L81 93 L60 80 L39 93 L45 69 L27 54 L51 52 Z" fill="url(#lg)" />
      <circle cx="60" cy="60" r="7" fill="#0b1230" />
      <circle cx="60" cy="60" r="3.2" fill="#4e9bff" />
    </svg>
  );
}

/** لوحة تفضيلات الوصولية — خط كبير، تباين عالٍ، تقليل الحركة */
function A11yPanel() {
  const { prefs, setPrefs } = useGameStore();
  const items = [
    { key: 'largeFont' as const, label: 'خط كبير', icon: '🔠' },
    { key: 'highContrast' as const, label: 'تباين عالٍ', icon: '🌓' },
    { key: 'reducedMotion' as const, label: 'تقليل الحركة', icon: '🐢' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass flex flex-col gap-2 p-4"
      role="group"
      aria-label="إعدادات الوصولية"
    >
      {items.map((item) => (
        <label key={item.key} className="flex cursor-pointer items-center gap-3 text-sm font-bold">
          <input
            type="checkbox"
            className="size-5 accent-[#e8b84b]"
            checked={prefs[item.key]}
            onChange={(e) => setPrefs({ ...prefs, [item.key]: e.target.checked })}
          />
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </label>
      ))}
    </motion.div>
  );
}

export function Home() {
  const { goSetup, goSolo, goOnline, goStats } = useGameStore();
  const [showA11y, setShowA11y] = useState(false);

  return (
    <main className="relative z-10 mx-auto flex min-h-svh w-full max-w-xl flex-col items-center justify-center gap-8 px-5 py-10 text-center">
      <div className="absolute top-4 left-4 flex gap-2">
        <MuteButton />
        <button
          type="button"
          className="btn-ghost !min-h-11 !px-3 !py-2 text-xl"
          aria-label="إعدادات الوصولية"
          aria-expanded={showA11y}
          title="إعدادات الوصولية"
          onClick={() => setShowA11y((v) => !v)}
        >
          ⚙️
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-4"
      >
        <Logo />
        <h1 className="bg-gradient-to-b from-gold-2 to-gold bg-clip-text text-5xl font-black text-transparent sm:text-6xl">
          بطل المعرفة
        </h1>
        <p className="max-w-sm text-lg text-ink-dim">
          مسابقة معلومات عربية سريعة — 5 جولات، جرس، سلاسل ذهبية، مواجهات إقصاء... وبطل واحد فقط 🏆
        </p>
      </motion.div>

      {showA11y && <A11yPanel />}

      <motion.nav
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex w-full max-w-sm flex-col gap-3"
        aria-label="القائمة الرئيسية"
      >
        <button type="button" className="btn-primary text-xl" onClick={goSetup}>
          🎮 حفلة محلية (2–6 لاعبين)
        </button>
        <button type="button" className="btn-ghost text-lg" onClick={goSolo}>
          ⚡ تدريب فردي — سباق الـ 60 ثانية
        </button>
        <button type="button" className="btn-ghost text-lg" onClick={goOnline}>
          🌐 تحدّي أونلاين
        </button>
        <button type="button" className="btn-ghost text-lg" onClick={goStats}>
          📊 الإحصاءات
        </button>
      </motion.nav>

      <p className="text-sm text-ink-dim/70">
        الانطلاقة • من يسبق؟ • السلسلة الذهبية • المواجهة • النهائي
      </p>
    </main>
  );
}
