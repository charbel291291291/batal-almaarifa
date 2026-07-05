/**
 * استيراد وتصدير حزم الأسئلة — JSON وCSV.
 * أعمدة CSV: type, question_text, answer, accepted_answers, wrong_answers,
 *            category, difficulty, explanation
 * القوائم داخل الخلية تُفصل بـ «|».
 */
import type { CategoryId, Difficulty, Question, QuestionType } from '../types';
import { ALL_CATEGORIES } from '../types';

const VALID_TYPES: QuestionType[] = ['direct', 'mcq', 'boolean', 'complete', 'clues'];
const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

const TIME_BY_TYPE: Record<string, number> = {
  direct: 20, mcq: 12, boolean: 8, complete: 15, clues: 30, audio: 20, image: 15,
};

export function newQuestionId(): string {
  return `cus-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/** يبني سؤالاً مكتملاً من مدخلات جزئية مع افتراضات آمنة */
export function buildQuestion(input: {
  type: QuestionType;
  question_text: string;
  answer: string;
  accepted_answers?: string[];
  wrong_answers?: string[];
  category: CategoryId;
  difficulty: Difficulty;
  explanation?: string;
  clues?: string[];
}): Question {
  return {
    id: newQuestionId(),
    type: input.type,
    question_text: input.question_text.trim(),
    answer: input.answer.trim(),
    accepted_answers: (input.accepted_answers ?? []).map((s) => s.trim()).filter(Boolean),
    wrong_answers: (input.wrong_answers ?? []).map((s) => s.trim()).filter(Boolean),
    category: input.category,
    difficulty: input.difficulty,
    explanation: input.explanation?.trim() || undefined,
    clues: input.clues?.map((s) => s.trim()).filter(Boolean),
    time_limit_seconds: TIME_BY_TYPE[input.type] ?? 15,
    points: 10,
    language: 'ar',
    tags: [],
    created_by: 'user',
    review_status: 'approved',
  };
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateQuestion(q: Partial<Question>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!q.question_text?.trim()) issues.push({ field: 'question_text', message: 'نص السؤال مطلوب' });
  if (q.type !== 'boolean' && !q.answer?.trim())
    issues.push({ field: 'answer', message: 'الإجابة مطلوبة' });
  if (!q.type || !VALID_TYPES.includes(q.type))
    issues.push({ field: 'type', message: 'نوع السؤال غير صالح' });
  if (!q.category || !ALL_CATEGORIES.includes(q.category))
    issues.push({ field: 'category', message: 'الفئة غير صالحة' });
  if (!q.difficulty || !VALID_DIFFICULTIES.includes(q.difficulty))
    issues.push({ field: 'difficulty', message: 'الصعوبة غير صالحة' });
  if (q.type === 'mcq' && (q.wrong_answers?.filter(Boolean).length ?? 0) < 3)
    issues.push({ field: 'wrong_answers', message: 'سؤال الاختيارات يحتاج 3 خيارات خاطئة' });
  if (q.type === 'boolean' && !['صح', 'خطأ'].includes(q.answer ?? ''))
    issues.push({ field: 'answer', message: 'إجابة صح/خطأ يجب أن تكون «صح» أو «خطأ»' });
  if (q.type === 'clues' && (q.clues?.filter(Boolean).length ?? 0) < 2)
    issues.push({ field: 'clues', message: 'سؤال التلميحات يحتاج تلميحين على الأقل' });
  return issues;
}

/* ---------- JSON ---------- */

export function exportJson(questions: Question[]): string {
  return JSON.stringify(questions, null, 2);
}

export function importJson(text: string): Question[] {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('ملف JSON يجب أن يحتوي مصفوفة أسئلة');
  return parsed.map((raw) => {
    const r = raw as Partial<Question>;
    const q = buildQuestion({
      type: (r.type as QuestionType) ?? 'direct',
      question_text: r.question_text ?? '',
      answer: r.answer ?? '',
      accepted_answers: r.accepted_answers,
      wrong_answers: r.wrong_answers,
      category: (r.category as CategoryId) ?? 'general',
      difficulty: (r.difficulty as Difficulty) ?? 'medium',
      explanation: r.explanation,
      clues: r.clues,
    });
    const issues = validateQuestion(q);
    if (issues.length > 0) throw new Error(`سؤال غير صالح («${q.question_text.slice(0, 30)}...»): ${issues[0].message}`);
    return q;
  });
}

/* ---------- CSV ---------- */

const CSV_HEADERS = [
  'type',
  'question_text',
  'answer',
  'accepted_answers',
  'wrong_answers',
  'category',
  'difficulty',
  'explanation',
] as const;

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportCsv(questions: Question[]): string {
  const rows = questions.map((q) =>
    [
      q.type,
      q.question_text,
      q.answer,
      q.accepted_answers.join('|'),
      q.wrong_answers.join('|'),
      q.category,
      q.difficulty,
      q.explanation ?? '',
    ]
      .map(csvEscape)
      .join(','),
  );
  // BOM لدعم العربية في Excel
  return '﻿' + [CSV_HEADERS.join(','), ...rows].join('\n');
}

/** محلل CSV صغير يدعم الخلايا المقتبسة والأسطر داخل الاقتباس */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

export function importCsv(text: string): Question[] {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('ملف CSV فارغ أو بلا صفوف بيانات');
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => headers.indexOf(name);
  if (col('question_text') === -1 || col('answer') === -1)
    throw new Error('الأعمدة المطلوبة مفقودة: question_text و answer');

  return rows.slice(1).map((cells, idx) => {
    const get = (name: string) => {
      const i = col(name);
      return i === -1 ? '' : (cells[i] ?? '').trim();
    };
    const split = (v: string) => v.split('|').map((s) => s.trim()).filter(Boolean);
    const q = buildQuestion({
      type: (get('type') || 'direct') as QuestionType,
      question_text: get('question_text'),
      answer: get('answer'),
      accepted_answers: split(get('accepted_answers')),
      wrong_answers: split(get('wrong_answers')),
      category: (get('category') || 'general') as CategoryId,
      difficulty: (get('difficulty') || 'medium') as Difficulty,
      explanation: get('explanation') || undefined,
    });
    const issues = validateQuestion(q);
    if (issues.length > 0) throw new Error(`الصف ${idx + 2}: ${issues[0].message}`);
    return q;
  });
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
