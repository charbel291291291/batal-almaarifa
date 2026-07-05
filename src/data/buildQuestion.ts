/**
 * مساعد بناء الأسئلة المشترك — تستخدمه كل ملفات البنك.
 */
import type { CategoryId, Difficulty, Question, QuestionType } from '../types';

export interface QInput {
  id: string;
  type: QuestionType;
  text: string;
  answer: string;
  accepted?: string[];
  wrong?: string[];
  category: CategoryId;
  difficulty: Difficulty;
  explanation?: string;
  clues?: string[];
  tags?: string[];
}

const TIME_BY_TYPE: Record<QuestionType, number> = {
  direct: 20,
  mcq: 12,
  boolean: 8,
  complete: 15,
  clues: 30,
  audio: 20,
  image: 15,
};

export function q(input: QInput): Question {
  return {
    id: input.id,
    type: input.type,
    question_text: input.text,
    answer: input.answer,
    accepted_answers: input.accepted ?? [],
    wrong_answers: input.wrong ?? [],
    category: input.category,
    difficulty: input.difficulty,
    explanation: input.explanation,
    clues: input.clues,
    time_limit_seconds: TIME_BY_TYPE[input.type],
    points: 10,
    language: 'ar',
    tags: input.tags ?? [],
    created_by: 'core',
    review_status: 'approved',
  };
}
