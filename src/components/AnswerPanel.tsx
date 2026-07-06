import { useMemo, useRef, useState } from 'react';
import type { Question } from '../types';
import { buildOptions } from '../lib/questionPicker';
import { useI18n } from '../lib/useI18n';

interface Props {
  question: Question;
  disabled?: boolean;
  /** عرض خيارات دائماً حتى للأسئلة المباشرة (جولة الجرس) */
  forceOptions?: boolean;
  onSubmit: (value: string, elapsedMs: number) => void;
}

/**
 * لوحة الإجابة — اختيارات للأسئلة متعددة الخيارات وصح/خطأ،
 * وحقل كتابة للإجابات المباشرة وأسئلة الإكمال.
 */
export function AnswerPanel({ question, disabled = false, forceOptions = false, onSubmit }: Props) {
  const { t, dir } = useI18n();
  const mountedAt = useRef(Date.now());
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<string | null>(null);

  const showOptions =
    question.type === 'mcq' ||
    question.type === 'boolean' ||
    (forceOptions && question.wrong_answers.length >= 3);
  const options = useMemo(
    () => (showOptions ? buildOptions(question) : null),
    [question, showOptions],
  );

  const submit = (value: string) => {
    if (disabled || picked) return;
    setPicked(value);
    onSubmit(value, Date.now() - mountedAt.current);
  };

  if (options) {
    return (
      <div
        className={`mt-5 grid gap-3 ${question.type === 'boolean' ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}
        role="group"
        aria-label={t('answerOptions')}
      >
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className="option-btn"
            disabled={disabled || picked !== null}
            data-state={picked === opt ? (opt === question.answer ? 'correct' : 'wrong') : undefined}
            onClick={() => submit(opt)}
          >
            {question.type === 'boolean'
              ? ['صح', 'True', 'Vrai'].includes(opt)
                ? t('booleanTrue')
                : t('booleanFalse')
              : opt}
          </button>
        ))}
      </div>
    );
  }

  return (
    <form
      className="mt-5 flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (typed.trim()) submit(typed);
      }}
    >
      <input
        className="text-input flex-1"
        dir={dir}
        autoFocus
        value={typed}
        disabled={disabled || picked !== null}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={t('answerPlaceholder')}
        aria-label={t('answerField')}
        autoComplete="off"
      />
      <button type="submit" className="btn-primary" disabled={disabled || picked !== null || !typed.trim()}>
        {t('answer')}
      </button>
    </form>
  );
}
