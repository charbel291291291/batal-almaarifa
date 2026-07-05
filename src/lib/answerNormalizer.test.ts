import { describe, expect, it } from 'vitest';
import { isAnswerCorrect, levenshtein, normalizeArabic, stripAlLam } from './answerNormalizer';

describe('normalizeArabic', () => {
  it('يزيل التشكيل', () => {
    expect(normalizeArabic('مُحَمَّد')).toBe('محمد');
  });

  it('يوحد الهمزات إلى ألف', () => {
    expect(normalizeArabic('أحمد')).toBe('احمد');
    expect(normalizeArabic('إبراهيم')).toBe('ابراهيم');
    expect(normalizeArabic('آمنة')).toBe('امنه');
  });

  it('يوحد التاء المربوطة والألف المقصورة', () => {
    expect(normalizeArabic('القاهرة')).toBe(normalizeArabic('القاهره'));
    expect(normalizeArabic('مصطفى')).toBe('مصطفي');
  });

  it('يحول الأرقام الهندية إلى لاتينية', () => {
    expect(normalizeArabic('١٩٤٥')).toBe('1945');
  });

  it('يسقط الترقيم ويضغط المسافات', () => {
    expect(normalizeArabic('  الرباط ، عاصمة! ')).toBe('الرباط عاصمه');
  });
});

describe('stripAlLam', () => {
  it('يسقط ال التعريف من الكلمات الطويلة فقط', () => {
    expect(stripAlLam('الرباط')).toBe('رباط');
    expect(stripAlLam('الى')).toBe('الى'); // قصيرة — لا تُمس
  });
});

describe('levenshtein', () => {
  it('يحسب مسافة التحرير', () => {
    expect(levenshtein('كتاب', 'كتاب')).toBe(0);
    expect(levenshtein('كتاب', 'كتب')).toBe(1);
    expect(levenshtein('', 'ابc')).toBe(3);
  });
});

describe('isAnswerCorrect', () => {
  it('يطابق الإجابة الرسمية بعد التطبيع', () => {
    expect(isAnswerCorrect('القاهره', 'القاهرة')).toBe(true);
    expect(isAnswerCorrect('  الرِّباط ', 'الرباط')).toBe(true);
  });

  it('يقبل الصيغ البديلة', () => {
    expect(isAnswerCorrect('ايفرست', 'إفرست', ['جبل إفرست', 'ايفرست'])).toBe(true);
  });

  it('يتسامح مع ال التعريف', () => {
    expect(isAnswerCorrect('رباط', 'الرباط')).toBe(true);
  });

  it('يقبل خطأ إملائياً واحداً في الإجابات الطويلة', () => {
    expect(isAnswerCorrect('نواقشوط', 'نواكشوط')).toBe(true);
  });

  it('يرفض الإجابات الخاطئة والفارغة', () => {
    expect(isAnswerCorrect('الدار البيضاء', 'الرباط')).toBe(false);
    expect(isAnswerCorrect('', 'الرباط')).toBe(false);
    expect(isAnswerCorrect('  ', 'الرباط')).toBe(false);
  });

  it('لا يتسامه إملائياً مع الإجابات القصيرة', () => {
    expect(isAnswerCorrect('56', '65')).toBe(false);
    expect(isAnswerCorrect('قط', 'قل')).toBe(false);
  });
});
