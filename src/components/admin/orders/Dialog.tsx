'use client';

// Genel amaçlı panel diyaloğu — ConfirmDialog ile aynı stil sınıfları ve odak
// tuzağı (useDialog), ancak serbest içerik alır.

import { createPortal } from 'react-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useDialog, useScrollLock } from '@/lib/hooks';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function Dialog({ open, title, description, onClose, children, footer, wide }: Props) {
  const ref = useDialog(open, onClose);
  useScrollLock(open);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;

  return createPortal(
    <div className="admin-dialog-backdrop" onMouseDown={onClose}>
      <div
        ref={ref}
        className="admin-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
        style={wide ? { maxWidth: 760 } : undefined}
      >
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="admin-dialog-title" className="text-base font-semibold text-[var(--brand-purple-deep)]">
              {title}
            </h2>
            {description && <p className="admin-hint mt-0.5">{description}</p>}
          </div>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onClose} aria-label="Kapat">
            <X size={14} />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
        {footer && <footer className="mt-4 flex flex-wrap justify-end gap-2">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
