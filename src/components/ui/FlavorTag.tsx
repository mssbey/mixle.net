import { cn } from '@/lib/utils';
import type { FlavorProfile } from '@/types';

type FlavorMeta = { label: string; dot: string; chip: string };

/** Varsayılan profillerin renkleri; panelden eklenen profiller nötr renk alır. */
export const flavorMeta: Record<string, FlavorMeta> = {
  meyveli: { label: 'Meyveli', dot: 'bg-gold-400', chip: 'bg-gold-50 text-gold-700 ring-gold-200' },
  ferah: { label: 'Ferah', dot: 'bg-sky-400', chip: 'bg-sky-50 text-sky-700 ring-sky-200' },
  tatli: { label: 'Tatlı', dot: 'bg-rose-400', chip: 'bg-rose-50 text-rose-700 ring-rose-200' },
  eksi: { label: 'Ekşi', dot: 'bg-lime-500', chip: 'bg-lime-50 text-lime-700 ring-lime-200' },
  kremsi: { label: 'Kremsi', dot: 'bg-amber-300', chip: 'bg-amber-50 text-amber-800 ring-amber-200' },
  tutun: { label: 'Tütün', dot: 'bg-stone-500', chip: 'bg-stone-100 text-stone-700 ring-stone-300' },
  icecek: { label: 'İçecek', dot: 'bg-orange-400', chip: 'bg-orange-50 text-orange-700 ring-orange-200' },
  mentollu: { label: 'Mentollü', dot: 'bg-emerald-400', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};

const neutralMeta = (profile: FlavorProfile): FlavorMeta => ({
  label: profile,
  dot: 'bg-violet-400',
  chip: 'bg-violet-50 text-violet-700 ring-violet-200',
});

const metaOf = (profile: FlavorProfile): FlavorMeta => flavorMeta[profile] ?? neutralMeta(profile);

export function FlavorTag({
  profile,
  label,
  className,
}: {
  profile: FlavorProfile;
  label?: string;
  className?: string;
}) {
  const m = metaOf(profile);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        m.chip,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} aria-hidden />
      {label ?? m.label}
    </span>
  );
}

export function FlavorDots({ profiles, className }: { profiles: FlavorProfile[]; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)} aria-hidden>
      {profiles.slice(0, 4).map((p) => (
        <span key={p} className={cn('h-2 w-2 rounded-full ring-2 ring-white', metaOf(p).dot)} />
      ))}
    </div>
  );
}
