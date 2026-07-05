import { describe, expect, it } from 'vitest';
import type { Question } from '../types';
import {
  exportCsv,
  exportJson,
  importCsv,
  importJson,
  newQuestionId,
  parseCsv,
} from './packIO';

const QUESTION: Question = {
  id: 'original',
  type: 'mcq',
  question_text: 'ما عاصمة المغرب؟',
  answer: 'الرباط',
  accepted_answers: ['رباط'],
  wrong_answers: ['فاس', 'مراكش', 'طنجة'],
  category: 'capitals',
  difficulty: 'easy',
  explanation: 'الرباط هي العاصمة السياسية للمغرب.',
  time_limit_seconds: 12,
  points: 10,
  language: 'ar',
  tags: [],
};

describe('معرّفات الأسئلة المخصصة', () => {
  it('تولد معرّفات UUID فريدة', () => {
    const ids = new Set(Array.from({ length: 1_000 }, newQuestionId));
    expect(ids.size).toBe(1_000);
    expect([...ids].every((id) => /^cus-[0-9a-f-]{36}$/.test(id))).toBe(true);
  });
});

describe('استيراد وتصدير الحزم', () => {
  it('يحافظ JSON على حقول السؤال الأساسية', () => {
    const [imported] = importJson(exportJson([QUESTION]));
    expect(imported).toMatchObject({
      type: QUESTION.type,
      question_text: QUESTION.question_text,
      answer: QUESTION.answer,
      accepted_answers: QUESTION.accepted_answers,
      wrong_answers: QUESTION.wrong_answers,
      category: QUESTION.category,
      difficulty: QUESTION.difficulty,
    });
  });

  it('يدعم CSV العربي والفواصل والاقتباسات والأسطر داخل الخلية', () => {
    const source = {
      ...QUESTION,
      question_text: 'سؤال، فيه "اقتباس"؟',
      explanation: 'سطر أول\nسطر ثانٍ',
    };
    const [imported] = importCsv(exportCsv([source]));
    expect(imported.question_text).toBe(source.question_text);
    expect(imported.explanation).toBe(source.explanation);
  });

  it('يرفض الصفوف غير الصالحة', () => {
    expect(() => importCsv('question_text,answer,type\nسؤال,,mcq')).toThrow();
    expect(() => importJson('{"question_text":"ليس مصفوفة"}')).toThrow();
  });

  it('يحلل نهايات الأسطر المختلفة', () => {
    expect(parseCsv('a,b\r\n1,2\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });
});
