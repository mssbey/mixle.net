import { cn } from '@/lib/utils';
import type { BadgeKind } from '@/types';

const config: Record<BadgeKind, { label: string; className: string }> = {
  yeni: { label: 'Yeni', className: 'bg-ink text-white' },
  'cok-satan': { label: 'Çok Satan', className: 'bg-gold-400 text-ink' },
  'sinirli-seri': { label: 'Özel Seri', className: 'bg-purple-800 text-white' },
  indirim: { label: 'İndirim', className: 'bg-brand-500 text-white' },
};

export function Badge({ kind, className }: { kind: BadgeKind; className?: string }) {
  const c = config[kind];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        c.className,
        className,
      )}
    >
      {c.label}
    </span>
  );
}

export function BadgeStack({ kinds, className }: { kinds: BadgeKind[]; className?: string }) {
  if (!kinds.length) return null;
  // "indirim" rozetini son sıraya al, en fazla 2 göster
  const ordered = [...kinds].sort((a, b) => (a === 'indirim' ? 1 : 0) - (b === 'indirim' ? 1 : 0));
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {ordered.slice(0, 2).map((k) => (
        <Badge key={k} kind={k} />
      ))}
    </div>
  );
}
