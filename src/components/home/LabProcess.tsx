import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export function LabProcess() {
  return (
    <section className="section container-page">
      <div className="grid overflow-hidden rounded-3xl bg-[#eee9e1] lg:grid-cols-2">
        <figure className="relative min-h-80 lg:min-h-[540px]">
          <Image src="/images/showcase/inawera-vanilla.webp" alt="Inawera Vanilla aroma görseli" fill sizes="(max-width:1024px) 100vw, 640px" className="object-contain bg-white" />
          <figcaption className="absolute bottom-4 left-5 rounded bg-purple-900/70 px-2 py-1 text-xs text-white">Temsili aroma atölyesi</figcaption>
        </figure>
        <div className="flex flex-col justify-center p-7 sm:p-12 lg:p-16">
          <span className="eyebrow">Mixle yaklaşımı</span>
          <h2 className="mt-5 text-display-sm">İyi bir seçim,<br /><em className="font-normal">detaylarda başlar.</em></h2>
          <p className="mt-6 text-sm leading-7 text-ink-soft">Bizim için aroma keşfi, yalnızca bir isim seçmekten ibaret değil. Birbirini tamamlayan notaları, yoğunluğu ve ürün seçeneklerini birlikte değerlendirmek demek.</p>
          <p className="mt-4 text-sm leading-7 text-ink-soft">Mixle vitrini; profilleri karşılaştırabileceğin, seçenekleri inceleyebileceğin ve kendi seçkini oluşturabileceğin bir alan. Ürün bilgilerini anlaşılır bir yerde bulman için tasarlandı.</p>
          <Link href="/hakkimizda" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-purple-700">Hikâyemizi keşfet <ArrowUpRight size={18} /></Link>
        </div>
      </div>
    </section>
  );
}
