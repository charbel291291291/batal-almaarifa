import { useState } from 'react';
import { isMuted, setMuted } from '../lib/soundEngine';

export function MuteButton() {
  const [muted, set] = useState(isMuted());
  return (
    <button
      type="button"
      className="btn-ghost !min-h-11 !px-3 !py-2 text-xl"
      aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
      title={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
      onClick={() => {
        setMuted(!muted);
        set(!muted);
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
