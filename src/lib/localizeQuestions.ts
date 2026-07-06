import type { Question } from '../types';
import type { Locale } from './i18n';
import { QUESTION_TRANSLATIONS } from '../data/questionTranslations';

export type LocalizedQuestionFields = Pick<
  Question,
  'question_text' | 'answer' | 'accepted_answers' | 'wrong_answers'
> &
  Partial<Pick<Question, 'explanation' | 'clues'>>;

export type QuestionTranslationCatalog = Record<
  string,
  Record<Exclude<Locale, 'ar'>, LocalizedQuestionFields>
>;

export function localizeQuestion(question: Question, locale: Locale): Question {
  if (locale === 'ar') return question;
  const translation = QUESTION_TRANSLATIONS[question.id]?.[locale];
  if (!translation) return question;
  return {
    ...question,
    ...translation,
    language: locale,
  };
}

export function localizeQuestionBank(bank: Question[], locale: Locale): Question[] {
  if (locale === 'ar') return bank;
  return bank.map((question) => localizeQuestion(question, locale));
}
