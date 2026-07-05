import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Question } from '../types';
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '../types';

const CLUE_REVEAL_MS = 5000;

interface Props {
  question: Question;
  /** لعرض السؤال كلمة كلمة في جولة الجرس */
  visibleWords?: number;
  children?: React.ReactNode;
}

/** تلميحات متتالية — تلميح جديد كل 5 ثوانٍ */
function CluesList({ question }: { question: Question }) {
  const clues = question.clues ?? [];
  const [shown, setShown] = useState(1);

  useEffect(() => {
    setShown(1);
    if (clues.length <= 1) return;
    const t = setInterval(() => setShown((s) => Math.min(s + 1, clues.length)), CLUE_REVEAL_MS);
    return () => clearInterval(t);
  }, [question.id, clues.length]);

  return (
    <ul className="mt-3 space-y-2" aria-live="polite">
      {clues.slice(0, shown).map((clue, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-2 text-lg font-semibold"
        >
          <span className="text-gold-2" aria-hidden>🔎</span>
          {clue}
        </motion.li>
      ))}
      {shown < clues.length && (
        <li className="text-sm text-ink-dim">تلميح إضافي بعد قليل...</li>
      )}
    </ul>
  );
}

export function QuestionCard({ question, visibleWords, children }: Props) {
  const words = question.question_text.split(/\s+/);
  const shown = visibleWords === undefined ? words : words.slice(0, visibleWords);
  const hiddenCount = words.length - shown.length;

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="glass w-full p-5 sm:p-7"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="chip !min-h-0 !py-1" data-active="true">
          {CATEGORY_LABELS[question.category]}
        </span>
        <span className="chip !min-h-0 !py-1">{DIFFICULTY_LABELS[question.difficulty]}</span>
        {question.type === 'clues' && <span className="chip !min-h-0 !py-1">🔎 تلميحات</span>}
      </div>

      <p className="min-h-16 text-2xl leading-relaxed font-bold sm:text-3xl" dir="rtl">
        {shown.join(' ')}
        {hiddenCount > 0 && (
          <span className="text-ink-dim" aria-label={`${hiddenCount} كلمات لم تُكشف بعد`}>
            {' '}
            {Array.from({ length: Math.min(hiddenCount, 6) }, () => '•••').join(' ')}
          </span>
        )}
      </p>

      {question.type === 'clues' && question.clues && <CluesList question={question} />}

      {question.type === 'image' && question.media_url && (
        <img
          src={question.media_url}
          alt="صورة السؤال"
          className="mx-auto mt-4 max-h-64 rounded-xl object-contain"
        />
      )}
      {question.type === 'audio' && question.media_url && (
        <audio controls src={question.media_url} className="mx-auto mt-4 w-full" aria-label="مقطع السؤال الصوتي" />
      )}

      {children}
    </motion.div>
  );
}
