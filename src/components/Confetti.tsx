import { useMemo } from 'react';

const COLORS = ['#e8b84b', '#f5ce6e', '#2dd4a0', '#4e9bff', '#ff5a6e', '#ffffff'];

/** قصاصات احتفال خفيفة بلا مكتبات خارجية */
export function Confetti({ count = 80 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        duration: 2.5 + Math.random() * 2.5,
        color: COLORS[i % COLORS.length],
        rotate: Math.random() * 360,
      })),
    [count],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}vw`,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
