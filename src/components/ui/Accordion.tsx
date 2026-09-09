'use client';

import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AccordionItem {
  title: ReactNode;
  content: ReactNode;
}

export function Accordion({
  items,
  defaultOpen = -1,
  className,
  allowMultiple = true,
}: {
  items: AccordionItem[];
  defaultOpen?: number;
  className?: string;
  allowMultiple?: boolean;
}) {
  const [open, setOpen] = useState<number[]>(defaultOpen >= 0 ? [defaultOpen] : []);
  const baseId = useId();

  const toggle = (i: number) =>
    setOpen((prev) =>
      prev.includes(i)
        ? prev.filter((x) => x !== i)
        : allowMultiple
          ? [...prev, i]
          : [i],
    );

  return (
    <div className={cn('divide-y divide-line border-y border-line', className)}>
      {items.map((item, i) => {
        const isOpen = open.includes(i);
        return (
          <div key={i}>
            <h3>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                aria-controls={`${baseId}-panel-${i}`}
                id={`${baseId}-trigger-${i}`}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-semibold text-ink transition-colors hover:text-brand-500"
              >
                {item.title}
                <ChevronDown
                  size={18}
                  className={cn('shrink-0 text-ink-soft transition-transform duration-300', isOpen && 'rotate-180')}
                />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <m.div
                  key="content"
                  id={`${baseId}-panel-${i}`}
                  role="region"
                  aria-labelledby={`${baseId}-trigger-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pb-5 pr-8 text-sm leading-relaxed text-ink-soft">{item.content}</div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
