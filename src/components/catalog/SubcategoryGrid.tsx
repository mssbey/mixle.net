import Image from 'next/image';
import Link from 'next/link';

export interface SubcategoryCard {
  slug: string;
  name: string;
  image: string;
  count: number;
}

/** Ana kategori sayfasında alt kategorileri görselli kartlar olarak listeler. */
export function SubcategoryGrid({ items }: { items: SubcategoryCard[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((c) => (
        <li key={c.slug}>
          <Link href={`/kategori/${c.slug}`} className="group block text-center">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-mist shadow-soft transition-shadow group-hover:shadow-lift">
              {c.image ? (
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <span className="absolute inset-0 grid place-items-center px-3 text-lg font-bold text-ink-soft">
                  {c.name}
                </span>
              )}
            </div>
            <h2 className="mt-3 text-[15px] font-medium uppercase leading-snug text-ink transition-colors group-hover:text-brand-500">
              {c.name}
            </h2>
            <p className="mt-0.5 text-sm text-ink-soft">{c.count} ürün</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
