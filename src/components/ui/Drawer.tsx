'use client';

import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMounted, useScrollLock, useDialog } from '@/lib/hooks';
import { cn } from '@/lib/utils';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  side?: 'right' | 'left' | 'bottom';
  className?: string;
  title?: ReactNode;
}

const sideMotion = {
  right: { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } },
  left: { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } },
  bottom: { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } },
};

const sideClass = {
  right: 'right-0 top-0 h-full w-full max-w-md',
  left: 'left-0 top-0 h-full w-full max-w-md',
  bottom: 'inset-x-0 bottom-0 max-h-[86vh] w-full rounded-t-3xl',
};

export function Drawer({ open, onClose, children, label, side = 'right', className, title }: DrawerProps) {
  const mounted = useMounted();
  useScrollLock(open);
  const ref = useDialog(open, onClose);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div className="fixed inset-0 z-[110]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-purple-900/55 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <m.aside
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            initial={sideMotion[side].initial}
            animate={sideMotion[side].animate}
            exit={sideMotion[side].exit}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className={cn(
              'absolute flex flex-col border-purple-100 bg-cream shadow-lift outline-none',
              side === 'bottom' ? 'border-t' : side === 'right' ? 'border-l' : 'border-r',
              sideClass[side],
              className,
            )}
          >
            {side === 'bottom' && (
              <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-purple-200" aria-hidden />
            )}
            {title && (
              <header className="flex items-center justify-between gap-3 border-b border-purple-100 px-5 py-4">
                <div className="text-base font-bold tracking-tight text-ink">{title}</div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Kapat"
                  className="grid h-9 w-9 place-items-center rounded-full text-purple-700 transition-colors hover:bg-purple-50"
                >
                  <X size={18} />
                </button>
              </header>
            )}
            {children}
          </m.aside>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
