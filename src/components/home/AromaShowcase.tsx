import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const aromas = [
  { name: 'Vanilla', brand: 'Inawera', image: 'inawera-vanilla', category: 'tatli-kremsi', family: 'Tatlı & kremsi' },
  { name: 'Passion Fruit', brand: 'TFA', image: 'tfa-passion-fruit', category: 'meyveli', family: 'Meyveli' },
  { name: 'Crème Brûlée', brand: 'Inawera', image: 'inawera-creme-brulee', category: 'tatli-kremsi', family: 'Tatlı & kremsi' },
  { name: 'Caramel', brand: 'TFA', image: 'tfa-caramel', category: 'tatli-kremsi', family: 'Tatlı & kremsi' },
  { name: 'Wild Red Cap', brand: 'Inawera', image: 'inawera-wild-red-cap', category: 'meyveli', family: 'Meyveli' },
  { name: 'DX Frosted Donut', brand: 'TFA', image: 'tfa-frosted-donut', category: 'tatli-kremsi', family: 'Tatlı & kremsi' },
  { name: 'Shisha Gingerbread', brand: 'Inawera', image: 'inawera-gingerbread', category: 'tatli-kremsi', family: 'Tatlı & kremsi' },
  { name: 'Rainbow Sherbet', brand: 'TFA', image: 'tfa-rainbow-sherbet', category: 'meyveli', family: 'Meyveli' },
];

export function AromaShowcase() {
  return (
    <section className="section container-page" aria-labelledby="aroma-showcase-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="aroma-showcase-title" className="store-section-title">Lezzet dünyasını keşfet</h2>
          <p className="mt-2 text-xs leading-5 text-ink-soft">Inawera ve TFA ile meyveden tatlıya aroma profilleri.</p>
        </div>
        <Link href="/urunler" className="inline-flex items-center gap-1 text-xs font-semibold hover:text-brand-500">Tüm aromalar <ArrowUpRight size={15} /></Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {aromas.map((aroma) => (
          <Link key={aroma.image} href={`/kategori/${aroma.category}`} className="group overflow-hidden rounded-lg border border-line bg-white transition-colors hover:border-brand-500">
            <div className="relative aspect-square bg-white">
              <Image src={`/images/showcase/${aroma.image}.webp`} alt={`${aroma.brand} ${aroma.name} aroma görseli`} fill sizes="(max-width:639px) 50vw, (max-width:1300px) 25vw, 308px" className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]" />
            </div>
            <div className="border-t border-line p-3 sm:p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">{aroma.brand}</p>
              <h3 className="mt-1 text-sm font-semibold sm:text-base">{aroma.name}</h3>
              <p className="mt-3 flex items-center justify-between gap-2 text-[11px] font-medium text-brand-600">{aroma.family} kategorisi <ArrowUpRight size={14} className="shrink-0" /></p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
