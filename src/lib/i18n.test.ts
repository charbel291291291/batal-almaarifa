import { describe, expect, it } from 'vitest';
import { categoryLabel, difficultyLabel, localizedRoundCopy, roundLabel, translate } from './i18n';

describe('i18n catalogs', () => {
  it('translates core navigation into all three languages', () => {
    expect(translate('ar', 'onlineChallenge')).toContain('أونلاين');
    expect(translate('en', 'onlineChallenge')).toContain('Online');
    expect(translate('fr', 'onlineChallenge')).toContain('en ligne');
  });

  it('interpolates dynamic values', () => {
    expect(translate('en', 'questionProgress', { current: 2, total: 10 })).toBe('Question 2 / 10');
    expect(translate('fr', 'onlinePlayers', { count: 4 })).toBe('Joueurs (4/6)');
  });

  it('localizes categories, difficulties, and round names', () => {
    expect(categoryLabel('science', 'fr')).toBe('Sciences');
    expect(difficultyLabel('hard', 'en')).toBe('Hard');
    expect(roundLabel('r3', 'ar')).toBe('السلسلة الذهبية');
  });

  it('provides localized round instructions', () => {
    const arabic = { subtitle: 'عربي', rules: ['قاعدة'] };
    expect(localizedRoundCopy('r1', 'ar', arabic)).toBe(arabic);
    expect(localizedRoundCopy('r1', 'en', arabic).rules).toHaveLength(4);
    expect(localizedRoundCopy('r1', 'fr', arabic).subtitle).toContain('Échauffement');
  });
});
