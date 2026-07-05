import { describe, expect, it } from 'vitest';
import { QUESTION_BANK } from './questions';
import { normalizeArabic } from '../lib/answerNormalizer';
import { ALL_CATEGORIES } from '../types';

describe('بنك الأسئلة — سلامة وتفرّد', () => {
  it('يحتوي 1000 سؤال على الأقل', () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(1000);
  });

  it('كل المعرّفات فريدة (لا تكرار في id)', () => {
    const seen = new Map<string, number>();
    for (const q of QUESTION_BANK) seen.set(q.id, (seen.get(q.id) ?? 0) + 1);
    const dups = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);
    expect(dups).toEqual([]);
  });

  it('لا يتكرر نص أي سؤال (بعد التطبيع)', () => {
    const seen = new Map<string, string[]>();
    for (const q of QUESTION_BANK) {
      const key = normalizeArabic(q.question_text);
      seen.set(key, [...(seen.get(key) ?? []), q.id]);
    }
    const dups = [...seen.entries()].filter(([, ids]) => ids.length > 1).map(([, ids]) => ids.join(','));
    expect(dups).toEqual([]);
  });

  it('كل سؤال اختيارات له 3 خيارات خاطئة على الأقل', () => {
    const bad = QUESTION_BANK.filter((q) => q.type === 'mcq' && q.wrong_answers.length < 3).map((q) => q.id);
    expect(bad).toEqual([]);
  });

  it('كل سؤال صح/خطأ إجابته «صح» أو «خطأ»', () => {
    const bad = QUESTION_BANK.filter((q) => q.type === 'boolean' && !['صح', 'خطأ'].includes(q.answer)).map((q) => q.id);
    expect(bad).toEqual([]);
  });

  it('الإجابة الصحيحة ليست ضمن الخيارات الخاطئة', () => {
    const bad = QUESTION_BANK.filter((q) => {
      const ans = normalizeArabic(q.answer);
      return q.wrong_answers.some((w) => normalizeArabic(w) === ans);
    }).map((q) => q.id);
    expect(bad).toEqual([]);
  });

  it('كل سؤال تلميحات يحمل تلميحين على الأقل', () => {
    const bad = QUESTION_BANK.filter((q) => q.type === 'clues' && (q.clues?.length ?? 0) < 2).map((q) => q.id);
    expect(bad).toEqual([]);
  });

  it('كل الفئات الـ22 ممثّلة، ولكل فئة 3 أسئلة صعبة/خبير على الأقل', () => {
    for (const cat of ALL_CATEGORIES) {
      const inCat = QUESTION_BANK.filter((q) => q.category === cat);
      expect(inCat.length, `الفئة ${cat} فارغة`).toBeGreaterThan(0);
      const hardish = inCat.filter((q) => q.difficulty === 'hard' || q.difficulty === 'expert');
      expect(hardish.length, `الفئة ${cat} تحتاج أسئلة صعبة/خبير`).toBeGreaterThanOrEqual(3);
    }
  });
});
