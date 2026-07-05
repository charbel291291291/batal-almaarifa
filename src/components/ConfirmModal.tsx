import { motion } from 'framer-motion';

interface Props {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** نافذة تأكيد مطابقة لهوية اللعبة — بديل حوارات المتصفح */
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel = 'إلغاء',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass w-full max-w-sm p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-xl font-black">{title}</h2>
        {message && <p className="mb-4 text-ink-dim">{message}</p>}
        <div className="mt-2 flex gap-3">
          <button type="button" className="btn-ghost flex-1" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" className="btn-primary flex-1 !bg-none !bg-danger !text-white" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
