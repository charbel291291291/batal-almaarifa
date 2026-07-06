import { useState } from 'react';
import { isMuted, setMuted } from '../lib/soundEngine';
import { useI18n } from '../lib/useI18n';

export function MuteButton() {
  const [muted, set] = useState(isMuted());
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="btn-ghost !min-h-11 !px-3 !py-2 text-xl"
      aria-label={muted ? t('unmute') : t('mute')}
      title={muted ? t('unmute') : t('mute')}
      onClick={() => {
        setMuted(!muted);
        set(!muted);
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
