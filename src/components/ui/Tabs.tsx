'use client';

import { useId, useState, type ReactNode } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ items, className }: { items: TabItem[]; className?: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const baseId = useId();

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Ürün bilgileri"
        className="hide-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4"
      >
        {items.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              id={`${baseId}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              className={cn(
                'relative shrink-0 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors',
                selected ? 'text-ink' : 'text-ink-soft hover:text-ink',
              )}
            >
              {t.label}
              {selected && (
                <m.span
                  layoutId={`${baseId}-underline`}
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500"
                />
              )}
            </button>
          );
        })}
      </div>
      {items.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${baseId}-panel-${t.id}`}
          aria-labelledby={`${baseId}-tab-${t.id}`}
          hidden={t.id !== active}
          className="pt-6 text-sm leading-relaxed text-ink-soft"
        >
          {t.id === active && t.content}
        </div>
      ))}
    </div>
  );
}
