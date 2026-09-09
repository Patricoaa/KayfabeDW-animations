import { useEffect, useRef } from 'react';

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = false,
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => cancelRef.current?.focus(), 10);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel();
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={description ? 'confirm-desc' : undefined}
    >
      <div className="w-full max-w-sm rounded-xl border border-border-default bg-card p-6 shadow-xl animate-in zoom-in-95">
        <h2 id="confirm-title" className="font-display text-lg font-bold text-primary">
          {title}
        </h2>
        {description && (
          <p id="confirm-desc" className="mt-2 text-sm text-secondary">
            {description}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-card-hover hover:text-primary focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:ring-2 focus:outline-none ${
              isDestructive
                ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500/50'
                : 'bg-amber-500 text-black hover:bg-amber-400 focus:ring-amber-500/50'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
