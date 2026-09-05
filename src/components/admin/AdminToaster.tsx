'use client';

import { createPortal } from 'react-dom';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useToast } from '@/store/toast';
import { useMounted } from '@/lib/hooks';

const iconMap = { success: CheckCircle2, info: Info, error: AlertTriangle };

/** Admin paneli bildirimleri. Vitrin Toaster'ıyla aynı store'u kullanır. */
export function AdminToaster() {
  const mounted = useMounted();
  const { toasts, dismiss } = useToast();
  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed right-4 top-[calc(var(--admin-topbar-h,60px)+10px)] z-[120] flex w-full max-w-sm flex-col gap-2"
      role="region"
      aria-live="polite"
      aria-label="Bildirimler"
    >
      {toasts.map((t) => {
        const Icon = iconMap[t.variant];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-[var(--admin-line)] bg-white p-3.5 shadow-[0_20px_50px_-24px_rgba(20,11,25,0.4)]"
          >
            <Icon
              size={18}
              className={
                t.variant === 'success'
                  ? 'mt-0.5 shrink-0 text-emerald-600'
                  : t.variant === 'error'
                    ? 'mt-0.5 shrink-0 text-rose-600'
                    : 'mt-0.5 shrink-0 text-purple-600'
              }
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--brand-purple-deep)]">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-[var(--admin-ink-soft)]">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Bildirimi kapat"
              className="shrink-0 rounded p-0.5 text-purple-300 transition-colors hover:text-purple-600"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
