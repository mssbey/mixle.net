'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { statusLabels, type ProductStatus } from '@/types/admin';

export function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span className={cn('admin-badge', `admin-badge-${status}`)}>{statusLabels[status]}</span>
  );
}

/** Ürün listesinde yayında ⇄ taslak aç/kapa düğmesi. Arşivdeki ürün "kapalı" görünür. */
export function StatusToggle({
  status,
  disabled,
  onToggle,
}: {
  status: ProductStatus;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const on = status === 'yayında';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={cn('admin-status-toggle', on && 'is-on')}
      title={on ? 'Yayında — taslağa almak için tıklayın' : 'Kapalı — yayına almak için tıklayın'}
    >
      <span className="admin-status-toggle__track" aria-hidden="true">
        <span className="admin-status-toggle__thumb" />
      </span>
      <span className="admin-status-toggle__label">{statusLabels[status]}</span>
    </button>
  );
}

export function StockBadge({ count }: { count: number }) {
  if (count <= 0) return <span className="admin-badge admin-badge-stok">Stok yok</span>;
  if (count <= 5)
    return (
      <span className="admin-badge admin-badge-taslak">Az stok · {count}</span>
    );
  return <span className="admin-badge admin-badge-yayında">Stokta · {count}</span>;
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-empty">
      <p className="text-sm font-semibold text-[var(--brand-purple-deep)]">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-xs">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="admin-card-list" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="admin-skeleton-row" />
      ))}
    </div>
  );
}

interface FieldProps {
  label: string;
  /** Tek bir form kontrolü sarmalanmıyorsa (ör. görsel seçici) boş bırakılabilir. */
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn('admin-field', className)}>
      <label className="admin-label" htmlFor={htmlFor}>
        {label}
        {required && <span aria-hidden="true" style={{ color: '#b4232f' }}> *</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="admin-hint" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="admin-error" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
  right,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="admin-card" style={{ padding: 16 }}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">{title}</h2>
          {description && <p className="admin-hint mt-0.5">{description}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

/** Gösterilecek sayfa numaraları; aradaki boşluklar `null` (… olarak çizilir). */
function pageWindow(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 9) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, 2, page - 1, page, page + 1, pageCount - 1, pageCount]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
}

/** Önceki / numaralı sayfalar / Sonraki + doğrudan sayfaya git kutusu. */
export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  const go = (p: number) => {
    const next = Math.min(pageCount, Math.max(1, Math.round(p)));
    if (next !== page) onChange(next);
  };
  return (
    <nav aria-label="Sayfalama" className="flex flex-wrap items-center justify-center gap-1.5">
      <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page <= 1} onClick={() => go(page - 1)}>
        Önceki
      </button>
      {pageWindow(page, pageCount).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="px-1 text-xs text-[var(--admin-ink-soft)]" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={cn('admin-btn admin-btn-sm tabular-nums', p === page ? 'admin-btn-primary' : 'admin-btn-ghost')}
            style={{ minWidth: 32, justifyContent: 'center' }}
            aria-label={`${p}. sayfa`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => go(p)}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page >= pageCount} onClick={() => go(page + 1)}>
        Sonraki
      </button>
      <form
        className="ml-2 flex items-center gap-1 text-xs text-[var(--admin-ink-soft)]"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem('sayfa') as HTMLInputElement;
          if (input.value) go(Number(input.value));
          input.value = '';
        }}
      >
        <label htmlFor="pagination-go">Sayfaya git</label>
        <input
          id="pagination-go"
          name="sayfa"
          type="number"
          min={1}
          max={pageCount}
          placeholder={String(page)}
          className="admin-input admin-btn-sm tabular-nums"
          style={{ width: 64 }}
          onWheel={(e) => e.currentTarget.blur()}
        />
        <button type="submit" className="admin-btn admin-btn-ghost admin-btn-sm">
          Git
        </button>
      </form>
    </nav>
  );
}
