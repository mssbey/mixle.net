import { cn } from '@/lib/utils';
import { currency, discountPercent } from '@/lib/site';

interface PriceProps {
  price: number;
  oldPrice?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showBadge?: boolean;
}

const sizeMap = {
  sm: { now: 'text-sm', was: 'text-xs' },
  md: { now: 'text-lg', was: 'text-sm' },
  lg: { now: 'text-2xl sm:text-3xl', was: 'text-base' },
};

export function Price({ price, oldPrice, size = 'md', className, showBadge = true }: PriceProps) {
  const pct = discountPercent(price, oldPrice);
  const s = sizeMap[size];
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      {pct > 0 && (
        <span className={cn('text-ink-soft line-through', s.was)}>{currency(oldPrice!)}</span>
      )}
      <span className={cn('font-bold tracking-tight text-ink', s.now, pct > 0 && 'text-brand-600')}>
        {currency(price)}
      </span>
      {pct > 0 && showBadge && (
        <span className="rounded bg-brand-50 px-1.5 py-0.5 text-xs font-bold text-brand-600">
          %{pct}
        </span>
      )}
    </div>
  );
}
