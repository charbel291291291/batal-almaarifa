/**
 * منتقي الأسئلة — يسحب أسئلة من البنك حسب الفئات والصعوبة دون تكرار.
 */
import type { CategoryId, Difficulty, Question, QuestionType } from '../types';

export interface PickOptions {
  categories: CategoryId[];
  difficulties: Difficulty[];
  count: number;
  excludeIds: string[];
  /** جولة الجرس تحتاج أسئلة لها خيارات خاطئة كافية */
  requireDistractors?: boolean;
  /** أنواع لا تصلح لبعض الجولات (مثل التلميحات في جولات الجرس) */
  excludeTypes?: QuestionType[];
}

export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickQuestions(bank: Question[], opts: PickOptions): Question[] {
  const excluded = new Set(opts.excludeIds);
  const excludedTypes = new Set(opts.excludeTypes ?? []);

  const base = (q: Question) =>
    !excluded.has(q.id) &&
    !excludedTypes.has(q.type) &&
    (!opts.requireDistractors || q.type === 'boolean' || q.wrong_answers.length >= 3);

  const matches = (q: Question, strict: boolean) =>
    base(q) &&
    opts.categories.includes(q.category) &&
    (!strict || opts.difficulties.includes(q.difficulty));

  let pool = shuffle(bank.filter((q) => matches(q, true)));

  // لو ما كفت الأسئلة بالصعوبة المطلوبة، وسّع للصعوبات كلها ثم لكل الفئات
  if (pool.length < opts.count) {
    const extra = shuffle(bank.filter((q) => matches(q, false) && !pool.some((p) => p.id === q.id)));
    pool = [...pool, ...extra];
  }
  if (pool.length < opts.count) {
    const extra = shuffle(bank.filter((q) => base(q) && !pool.some((p) => p.id === q.id)));
    pool = [...pool, ...extra];
  }

  return pool.slice(0, opts.count);
}

/** خيارات سؤال الاختيارات: الإجابة الصحيحة + 3 خاطئة، مخلوطة */
export function buildOptions(q: Question): string[] {
  if (q.type === 'boolean') return ['صح', 'خطأ'];
  return shuffle([q.answer, ...q.wrong_answers.slice(0, 3)]);
}
