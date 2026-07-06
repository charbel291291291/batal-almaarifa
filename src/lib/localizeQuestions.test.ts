import { describe, expect, it } from 'vitest';
import { QUESTION_BANK } from '../data/questions';
import { QUESTION_TRANSLATIONS } from '../data/questionTranslations';
import { localizeQuestionBank } from './localizeQuestions';

describe('question translations', () => {
  it('covers the complete question bank in both languages', () => {
    expect(Object.keys(QUESTION_TRANSLATIONS)).toHaveLength(QUESTION_BANK.length);
    for (const question of QUESTION_BANK) {
      expect(QUESTION_TRANSLATIONS[question.id]?.en.question_text).toBeTruthy();
      expect(QUESTION_TRANSLATIONS[question.id]?.fr.question_text).toBeTruthy();
    }
  });

  it.each(['en', 'fr'] as const)('localizes every playable field to %s', (locale) => {
    const localized = localizeQuestionBank(QUESTION_BANK, locale);
    expect(localized).toHaveLength(QUESTION_BANK.length);
    expect(localized.every((question) => question.language === locale)).toBe(true);
    expect(localized.every((question) => question.question_text && question.answer)).toBe(true);
    expect(localized.every((question) => question.wrong_answers.every(Boolean))).toBe(true);
  });

  it('keeps Arabic questions unchanged', () => {
    expect(localizeQuestionBank(QUESTION_BANK, 'ar')).toBe(QUESTION_BANK);
  });
});
