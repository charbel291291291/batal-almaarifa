import { describe, expect, it } from 'vitest';
import type { Question } from '../types';
import { buildOnlineChallenge, onlineErrorMessage } from './onlineGame';

function bank(): Question[] {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `online-${index}`,
    type: 'mcq',
    question_text: `سؤال ${index}`,
    answer: `جواب ${index}`,
    accepted_answers: [],
    wrong_answers: [`خطأ أ ${index}`, `خطأ ب ${index}`, `خطأ ج ${index}`],
    category: 'general',
    difficulty: 'easy',
    time_limit_seconds: 15,
    points: 10,
    language: 'ar',
    tags: [],
  }));
}

describe('buildOnlineChallenge', () => {
  it('يبني عشرة أسئلة بأربعة خيارات تتضمن الإجابة', () => {
    const challenge = buildOnlineChallenge(bank());
    expect(challenge).toHaveLength(10);
    for (const question of challenge) {
      expect(question.options).toHaveLength(4);
      expect(question.options).toContain(question.answer);
    }
  });

  it('لا يغيّر بنك الأسئلة المصدر', () => {
    const source = bank();
    const before = structuredClone(source);
    buildOnlineChallenge(source);
    expect(source).toEqual(before);
  });
});

describe('onlineErrorMessage', () => {
  it('يحوّل أخطاء الغرفة المعروفة إلى رسائل عربية', () => {
    expect(onlineErrorMessage(new Error('room_not_found'))).toContain('غير موجودة');
    expect(onlineErrorMessage(new Error('room_full'))).toContain('ممتلئة');
    expect(onlineErrorMessage(new Error('need_two_players'))).toContain('لاعبين');
  });
});
