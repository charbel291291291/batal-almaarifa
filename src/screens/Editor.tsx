import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { CategoryId, Difficulty, Question, QuestionType } from '../types';
import { ALL_CATEGORIES, CATEGORY_LABELS, DIFFICULTY_LABELS } from '../types';
import { loadCustomPack, saveCustomPack } from '../lib/prefs';
import {
  buildQuestion,
  downloadFile,
  exportCsv,
  exportJson,
  importCsv,
  importJson,
  validateQuestion,
} from '../lib/packIO';
import { QuestionCard } from '../components/QuestionCard';
import { ConfirmModal } from '../components/ConfirmModal';

const TYPE_LABELS: Record<Exclude<QuestionType, 'audio' | 'image'>, string> = {
  direct: 'إجابة مباشرة',
  mcq: 'اختيارات (4)',
  boolean: 'صح / خطأ',
  complete: 'أكمل العبارة',
  clues: 'خمّن من التلميحات',
};

interface Draft {
  type: QuestionType;
  question_text: string;
  answer: string;
  accepted: string;
  wrong: string;
  clues: string;
  category: CategoryId;
  difficulty: Difficulty;
  explanation: string;
}

const EMPTY_DRAFT: Draft = {
  type: 'direct',
  question_text: '',
  answer: '',
  accepted: '',
  wrong: '',
  clues: '',
  category: 'general',
  difficulty: 'medium',
  explanation: '',
};

/** صانع الأسئلة — حزمة مخصصة محفوظة محلياً، مع استيراد وتصدير CSV/JSON */
export function Editor() {
  const goHome = useGameStore((s) => s.goHome);
  const [pack, setPack] = useState<Question[]>(loadCustomPack());
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const splitList = (v: string) => v.split(/[|\n،]/).map((s) => s.trim()).filter(Boolean);

  const previewQuestion = buildQuestion({
    type: draft.type,
    question_text: draft.question_text || 'نص السؤال سيظهر هنا...',
    answer: draft.type === 'boolean' ? draft.answer || 'صح' : draft.answer || '—',
    accepted_answers: splitList(draft.accepted),
    wrong_answers: draft.type === 'boolean' ? ['خطأ'] : splitList(draft.wrong),
    category: draft.category,
    difficulty: draft.difficulty,
    explanation: draft.explanation,
    clues: splitList(draft.clues),
  });

  const save = (questions: Question[]) => {
    setPack(questions);
    saveCustomPack(questions);
  };

  const addQuestion = () => {
    setError(null);
    const q = buildQuestion({
      type: draft.type,
      question_text: draft.question_text,
      answer: draft.answer,
      accepted_answers: splitList(draft.accepted),
      wrong_answers: draft.type === 'boolean' ? ['خطأ', 'صح'].filter((x) => x !== draft.answer) : splitList(draft.wrong),
      category: draft.category,
      difficulty: draft.difficulty,
      explanation: draft.explanation,
      clues: draft.type === 'clues' ? splitList(draft.clues) : undefined,
    });
    const issues = validateQuestion(q);
    if (issues.length > 0) {
      setError(issues.map((i) => i.message).join(' • '));
      return;
    }
    save([q, ...pack]);
    setDraft(EMPTY_DRAFT);
    setNotice('تمت إضافة السؤال ✅');
    setTimeout(() => setNotice(null), 2000);
  };

  const onImportFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const imported = file.name.toLowerCase().endsWith('.csv') ? importCsv(text) : importJson(text);
      save([...imported, ...pack]);
      setNotice(`تم استيراد ${imported.length} سؤالاً ✅`);
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الاستيراد — تحقق من صيغة الملف');
    }
  };

  return (
    <main className="relative z-10 mx-auto w-full max-w-2xl px-5 py-8">
      {confirmClear && (
        <ConfirmModal
          title="حذف كل الأسئلة المخصصة؟"
          message={`سيتم حذف ${pack.length} سؤالاً نهائياً من هذا الجهاز.`}
          confirmLabel="نعم، احذف الكل"
          onConfirm={() => {
            save([]);
            setConfirmClear(false);
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-black text-gold-2">✍️ صانع الأسئلة</h1>
          <button type="button" className="btn-ghost !min-h-11 !py-2" onClick={goHome}>
            → رجوع
          </button>
        </div>

        <p className="mb-5 text-sm text-ink-dim">
          أسئلتك تُحفظ على هذا الجهاز وتُضاف إلى اللعبة من شاشة التجهيز («تضمين أسئلتي»).
          صدّرها JSON أو CSV لمشاركتها أو نقلها.
        </p>

        {/* نموذج السؤال */}
        <section className="glass mb-5 flex flex-col gap-4 p-5">
          <h2 className="text-xl font-bold">سؤال جديد</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
              النوع
              <select
                className="text-input"
                value={draft.type}
                onChange={(e) => set('type', e.target.value as QuestionType)}
              >
                {(Object.keys(TYPE_LABELS) as (keyof typeof TYPE_LABELS)[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
              الفئة
              <select
                className="text-input"
                value={draft.category}
                onChange={(e) => set('category', e.target.value as CategoryId)}
              >
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
              الصعوبة
              <select
                className="text-input"
                value={draft.difficulty}
                onChange={(e) => set('difficulty', e.target.value as Difficulty)}
              >
                {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                  <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
            نص السؤال
            <textarea
              className="text-input min-h-20 resize-y"
              dir="rtl"
              value={draft.question_text}
              onChange={(e) => set('question_text', e.target.value)}
              placeholder="مثال: ما عاصمة المغرب؟"
            />
          </label>

          {draft.type === 'boolean' ? (
            <div className="flex gap-3" role="group" aria-label="الإجابة الصحيحة">
              {['صح', 'خطأ'].map((v) => (
                <button
                  key={v}
                  type="button"
                  className="chip flex-1"
                  data-active={draft.answer === v}
                  onClick={() => set('answer', v)}
                >
                  {v}
                </button>
              ))}
            </div>
          ) : (
            <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
              الإجابة الصحيحة
              <input
                className="text-input"
                dir="rtl"
                value={draft.answer}
                onChange={(e) => set('answer', e.target.value)}
                placeholder="مثال: الرباط"
              />
            </label>
          )}

          {draft.type !== 'boolean' && (
            <>
              <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
                صيغ مقبولة إضافية (افصل بـ | أو سطر جديد)
                <input
                  className="text-input"
                  dir="rtl"
                  value={draft.accepted}
                  onChange={(e) => set('accepted', e.target.value)}
                  placeholder="مثال: رباط | مدينة الرباط"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
                خيارات خاطئة {draft.type === 'mcq' ? '(3 مطلوبة)' : '(3 مستحسنة — تُستخدم في جولات الجرس)'}
                <input
                  className="text-input"
                  dir="rtl"
                  value={draft.wrong}
                  onChange={(e) => set('wrong', e.target.value)}
                  placeholder="مثال: الدار البيضاء | مراكش | فاس"
                />
              </label>
            </>
          )}

          {draft.type === 'clues' && (
            <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
              التلميحات بالترتيب (افصل بـ | أو سطر جديد)
              <textarea
                className="text-input min-h-20 resize-y"
                dir="rtl"
                value={draft.clues}
                onChange={(e) => set('clues', e.target.value)}
                placeholder="تلميح عام أولاً | ثم أدق | ثم الأوضح"
              />
            </label>
          )}

          <label className="flex flex-col gap-2 text-sm font-bold text-ink-dim">
            شرح بعد الإجابة (اختياري)
            <input
              className="text-input"
              dir="rtl"
              value={draft.explanation}
              onChange={(e) => set('explanation', e.target.value)}
            />
          </label>

          {error && (
            <p className="rounded-xl border border-danger/50 bg-danger/10 p-3 text-sm font-bold text-danger" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-xl border border-emerald/50 bg-emerald/10 p-3 text-sm font-bold text-emerald" role="status">
              {notice}
            </p>
          )}

          <button type="button" className="btn-primary" onClick={addQuestion}>
            + أضف السؤال إلى حزمتي
          </button>
        </section>

        {/* معاينة */}
        <section className="mb-5">
          <h2 className="mb-3 text-xl font-bold">معاينة</h2>
          <QuestionCard question={previewQuestion} />
        </section>

        {/* الحزمة */}
        <section className="glass mb-5 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">حزمتي ({pack.length})</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="chip" onClick={() => fileRef.current?.click()}>
                📥 استيراد CSV/JSON
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => downloadFile('batal-pack.json', exportJson(pack), 'application/json')}
                disabled={pack.length === 0}
              >
                📤 تصدير JSON
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => downloadFile('batal-pack.csv', exportCsv(pack), 'text/csv;charset=utf-8')}
                disabled={pack.length === 0}
              >
                📤 تصدير CSV
              </button>
              {pack.length > 0 && (
                <button type="button" className="chip text-danger" onClick={() => setConfirmClear(true)}>
                  🗑️ حذف الكل
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImportFile(f);
                e.target.value = '';
              }}
            />
          </div>

          {pack.length === 0 ? (
            <p className="text-center text-ink-dim">لا أسئلة بعد — أضف أول سؤال من الأعلى.</p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
              {pack.map((q) => (
                <li key={q.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                  <span className="chip !min-h-0 shrink-0 !py-0.5 text-xs">{CATEGORY_LABELS[q.category]}</span>
                  <span className="flex-1 truncate text-sm font-bold">{q.question_text}</span>
                  <span className="shrink-0 text-xs text-emerald">{q.answer}</span>
                  <button
                    type="button"
                    className="btn-ghost !min-h-9 shrink-0 !px-2 !py-1 text-xs text-danger"
                    aria-label={`حذف: ${q.question_text}`}
                    onClick={() => save(pack.filter((x) => x.id !== q.id))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </motion.div>
    </main>
  );
}
