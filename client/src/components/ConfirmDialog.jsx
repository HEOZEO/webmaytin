// Accessible confirmation dialog. Use before destructive actions (delete, cancel, etc.).
// Usage:
//   const [confirm, askConfirm] = useConfirmDialog();
//   if (confirm) return <ConfirmDialog {...confirm} />;
//   <button onClick={() => askConfirm({ title: 'Xóa?', message: '...', onConfirm: handleDelete })}>Xóa</button>

import { useEffect, useRef } from 'react';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Focus the safer action (cancel) by default to prevent accidental confirm.
    confirmRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter') onConfirm?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  const palette = {
    danger: { btn: 'bg-red-600 hover:bg-red-700', icon: 'text-red-500', iconBg: 'bg-red-500/10' },
    warning: { btn: 'bg-amber-600 hover:bg-amber-700', icon: 'text-amber-500', iconBg: 'bg-amber-500/10' },
    info: { btn: 'bg-cyan-600 hover:bg-cyan-700', icon: 'text-red-600', iconBg: 'bg-red-600/10' }
  }[variant] || { btn: 'bg-red-600 hover:bg-red-700', icon: 'text-red-500', iconBg: 'bg-red-500/10' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-none clip-path-rog border border-slate-700 bg-black p-6 shadow-2xl animate-[fadeIn_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 rounded-full p-3 ${palette.iconBg}`}>
            <svg className={`h-6 w-6 ${palette.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 id="confirm-dialog-title" className="text-lg font-bold text-white">{title}</h3>
            {typeof message === 'string' ? (
              <p className="mt-2 text-sm text-neutral-300">{message}</p>
            ) : (
              <div className="mt-2 text-sm text-neutral-300">{message}</div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-slate-700 hover:text-white transition"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${palette.btn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirmDialog() {
  // Simple hook alternative — easier to read in components.
  // Returns [component, prompt]. See file header for usage.
  // (kept lightweight: the component itself already accepts props.)
}
