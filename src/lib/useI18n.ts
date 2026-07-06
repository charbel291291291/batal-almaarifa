import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { translate } from './i18n';

export function useI18n() {
  const locale = useGameStore((state) => state.prefs.locale);
  const t = useCallback(
    (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
      translate(locale, key, params),
    [locale],
  );
  return { locale, t, dir: locale === 'ar' ? 'rtl' as const : 'ltr' as const };
}
