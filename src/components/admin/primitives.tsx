'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { statusLabels, type ProductStatus } from '@/types/admin';

export function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span className={cn('admin-badge', `admin-badge-${status}`)}>{statusLabels[status]}</span>
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
  htmlFor: string;
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
