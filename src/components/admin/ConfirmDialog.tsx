'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useDialog, useScrollLock } from '@/lib/hooks';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Onayla',
  cancelLabel = 'Vazgeç',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useDialog(open, onCancel);
  useScrollLock(open);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="admin-dialog-backdrop" onMouseDown={onCancel}>
      <div
        ref={ref}
        className="admin-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby={description ? 'admin-confirm-desc' : undefined}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="admin-confirm-title" className="text-base font-semibold text-[var(--brand-purple-deep)]">
          {title}
        </h2>
        {description && (
          <p id="admin-confirm-desc" className="mt-2 text-sm text-[var(--admin-ink-soft)]">
            {description}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={destructive ? 'admin-btn admin-btn-danger' : 'admin-btn admin-btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
