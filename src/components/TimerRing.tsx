import { useEffect, useRef, useState } from 'react';
import { sounds } from '../lib/soundEngine';

interface Props {
  /** المدة بالثواني */
  duration: number;
  /** إعادة تشغيل المؤقت عند تغيّر هذا المفتاح */
  resetKey: string | number;
  running: boolean;
  onTimeout: () => void;
  size?: number;
}

/** حلقة مؤقت متحركة — تنبض وتحمرّ في الثواني الأخيرة */
export function TimerRing({ duration, resetKey, running, onTimeout, size = 84 }: Props) {
  const [remaining, setRemaining] = useState(duration);
  const timeoutRef = useRef(onTimeout);
  timeoutRef.current = onTimeout;
  const tickedRef = useRef<number>(-1);

  useEffect(() => {
    setRemaining(duration);
    if (!running) return;
    const start = performance.now();
    let raf = 0;
    let done = false;
    const loop = (t: number) => {
      const left = duration - (t - start) / 1000;
      if (left <= 0) {
        if (!done) {
          done = true;
          setRemaining(0);
          timeoutRef.current();
        }
        return;
      }
      const whole = Math.ceil(left);
      if (whole <= 3 && whole !== tickedRef.current) {
        tickedRef.current = whole;
        sounds.tick();
      }
      setRemaining(left);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [resetKey, running, duration]);

  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const ratio = Math.max(0, remaining / duration);
  const danger = remaining <= 3;
  const color = danger ? 'var(--color-danger)' : 'var(--color-electric)';

  return (
    <div
      role="timer"
      aria-label={`الوقت المتبقي ${Math.ceil(remaining)} ثانية`}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={7} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - ratio)}
          style={{ transition: 'stroke 0.3s' }}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-2xl font-black ${danger ? 'text-danger animate-pulse' : 'text-ink'}`}
      >
        {Math.ceil(remaining)}
      </span>
    </div>
  );
}
