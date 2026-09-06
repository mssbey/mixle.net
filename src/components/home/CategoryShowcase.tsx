import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { getCategories } from '@/data/categories';
import { SectionHeading } from '@/components/ui/Reveal';

export async function CategoryShowcase() {
  const categories = await getCategories();
  return (
    <section className="section container-page">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <SectionHeading eyebrow="Aroma koleksiyonu" title="Her zevkin bir notası var." description="Tanıdık bir tatla başla. Yeni bir karakter keşfet." />
        <Link href="/urunler" className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700">Tüm aromalar <ArrowUpRight size={18} /></Link>
      </div>
      <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
        {categories.slice(0, 6).map((c, i) => (
          <Link key={c.slug} href={'/kategori/' + c.slug} className="group min-w-0">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#eee9e1]">
              <Image src={c.cover} alt={c.name + ' için temsili tat kompozisyonu'} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 210px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute left-3 top-3 text-[11px] font-semibold text-purple-800">0{i + 1}</span>
              <span className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-cream/95 text-purple-700 transition-colors group-hover:bg-purple-600 group-hover:text-white"><ArrowUpRight size={16} /></span>
            </div>
            <h3 className="mt-4 text-base sm:text-lg">{c.name}</h3>
            <p className="mt-1 text-xs leading-5 text-ink-soft">{c.tagline}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
