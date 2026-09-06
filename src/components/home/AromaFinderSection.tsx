import { AromaFinder } from './AromaFinder';
import { SectionHeading, Reveal } from '@/components/ui/Reveal';
import { getProducts } from '@/data/products';

export async function AromaFinderSection() {
  const products = await getProducts();
  return (
    <section className="section container-page" id="bulucu">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <SectionHeading
          eyebrow="Aroma Bulucu"
          title="Beş soruda kendi profilini bul"
          description="Tat tercihini, ferahlık ve tatlılık beklentini paylaş; sana en yakın üç aromayı önerelim. Sonucu paylaşabilir, dilediğin zaman yeniden deneyebilirsin."
        />
        <Reveal>
          <AromaFinder products={products} />
        </Reveal>
      </div>
    </section>
  );
}
