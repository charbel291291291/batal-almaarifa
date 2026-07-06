import { describe, expect, it } from 'vitest';
import type { Question } from '../types';
import { buildOptions, pickQuestions } from './questionPicker';

function question(
  id: string,
  category: Question['category'],
  difficulty: Question['difficulty'],
  wrongAnswers = ['أ', 'ب', 'ج'],
): Question {
  return {
    id,
    type: 'mcq',
    question_text: `سؤال ${id}`,
    answer: `جواب ${id}`,
    accepted_answers: [],
    wrong_answers: wrongAnswers,
    category,
    difficulty,
    time_limit_seconds: 10,
    points: 10,
    language: 'ar',
    tags: [],
  };
}

describe('pickQuestions', () => {
  const bank = [
    question('strict', 'general', 'easy'),
    question('other-difficulty', 'general', 'hard'),
    question('other-category', 'science', 'easy'),
    question('excluded', 'general', 'easy'),
    question('few-options', 'general', 'easy', ['أ']),
  ];

  it('يحترم الاستثناءات والمتطلبات الصارمة أولاً', () => {
    const picked = pickQuestions(bank, {
      categories: ['general'],
      difficulties: ['easy'],
      count: 1,
      excludeIds: ['excluded'],
      requireDistractors: true,
    });
    expect(picked.map((q) => q.id)).toEqual(['strict']);
  });

  it('يوسع الصعوبة ثم الفئة عند نقص البنك من دون تكرار', () => {
    const picked = pickQuestions(bank, {
      categories: ['general'],
      difficulties: ['easy'],
      count: 3,
      excludeIds: ['excluded'],
      requireDistractors: true,
    });
    expect(new Set(picked.map((q) => q.id)).size).toBe(3);
    expect(picked.map((q) => q.id)).toContain('strict');
    expect(picked.map((q) => q.id)).toContain('other-difficulty');
    expect(picked.map((q) => q.id)).toContain('other-category');
  });
});

describe('buildOptions', () => {
  it('يبني أربع إجابات بلا تغيير المصدر', () => {
    const q = question('options', 'general', 'easy');
    const options = buildOptions(q);
    expect(options).toHaveLength(4);
    expect(options).toContain(q.answer);
    expect(q.wrong_answers).toEqual(['أ', 'ب', 'ج']);
  });
});
