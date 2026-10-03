import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface HomeBanner {
  image: string;
  alt: string;
  href: string;
  width: number;
  height: number;
}

const cols = { 2: 'grid-cols-1 md:grid-cols-2', 3: 'grid-cols-1 md:grid-cols-3', 4: 'grid-cols-2 md:grid-cols-4' } as const;

/** Referanstaki "columns-grid" bloğu: yuvarlak köşeli, gölgeli marka bannerları. */
export function HomeBanners({ banners, columns }: { banners: HomeBanner[]; columns: 2 | 3 | 4 }) {
  return (
    <section className="mx-auto max-w-[1300px] px-2 sm:px-4">
      <div className={cn('grid gap-4', cols[columns])}>
        {banners.map((b) => (
          <div key={b.image} className="relative w-full overflow-hidden rounded-xl">
            <Link href={b.href} aria-label={b.alt}>
              <Image
                src={b.image}
                alt={b.alt}
                width={b.width}
                height={b.height}
                sizes={`(max-width: 768px) ${columns === 4 ? '50vw' : '100vw'}, ${Math.round(1268 / columns)}px`}
                className="h-auto w-full rounded-xl object-cover shadow-sm transition-opacity hover:opacity-90"
              />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
