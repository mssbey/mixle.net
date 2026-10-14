import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';
import { site } from '@/lib/site';
import { formatMinor } from '@/lib/money';
import { getShippingPolicy, type ShippingPolicyMethod } from '@/server/shipping/policy';

export const metadata: Metadata = {
  title: 'İade ve Teslimat Koşulları',
  description: 'Örnek iade, değişim ve teslimat koşulları.',
  alternates: { canonical: '/iade-ve-teslimat' },
};

export default async function ReturnsPage() {
  // Kargo ücretleri panelden (mağazanın kargo bölgeleri/yöntemleri).
  const shipping = await getShippingPolicy();
  return (
    <div className="container-page section !pt-8">
      <Breadcrumbs items={[{ label: 'İade ve Teslimat Koşulları' }]} />
      <LegalLayout title="İade ve Teslimat Koşulları" updated="Örnek belge">
        <LegalSection title="1. Teslimat Süresi">
          <p>
            Siparişler örnek olarak {site.commerce.estimatedDelivery.toLowerCase()}. Yoğun kampanya
            dönemlerinde bu süre uzayabilir; kesin süre gerçek kargo entegrasyonu tamamlandığında
            gösterilecektir.
          </p>
        </LegalSection>
        <LegalSection title="2. Kargo Ücreti">
          {shipping.zones.length === 0 ? (
            <p>Kargo ücreti ödeme adımında teslimat adresinize göre hesaplanır.</p>
          ) : (
            <>
              <p>
                Kargo ücreti teslimat adresinize ve seçtiğiniz kargo yöntemine göre ödeme adımında
                kesinleşir. Ücretsiz kargo eşikleri kampanya ve kupon indirimleri düşüldükten sonraki
                ürün tutarına uygulanır.
              </p>
              {shipping.zones.map((z) => (
                <div key={z.name} className="mt-3">
                  {shipping.zones.length > 1 && (
                    <p className="font-semibold">
                      {z.name}
                      {z.cities.length > 0 ? ` (${z.cities.join(', ')})` : ''}
                    </p>
                  )}
                  <ul className="mt-1 list-disc pl-5">
                    {z.methods.map((m) => (
                      <li key={m.name}>{methodLine(m)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </LegalSection>
        <LegalSection title="3. İade Koşulları">
          <p>
            Ambalajı açılmamış, kullanılmamış ürünler teslim tarihinden itibaren 14 gün içinde iade
            edilebilir (örnek koşul). Hijyen nedeniyle ambalajı açılmış aroma ürünlerinde iade kabul
            edilmeyebilir; kesin koşullar ürün etiketinde belirtilir.
          </p>
        </LegalSection>
        <LegalSection title="4. Hasarlı veya Yanlış Ürün Teslimatı">
          <p>
            Hasarlı, eksik veya yanlış ürün teslimatlarında ürünü teslim aldıktan sonra en kısa sürede
            iletişim kanallarımızdan bize ulaşmanız rica olunur.
          </p>
        </LegalSection>
        <LegalSection title="5. Değişim">
          <p>
            Hacim veya yoğunluk değişikliği talepleri, ürün kullanılmamış ve ambalajı açılmamış olması
            koşuluyla değerlendirilir.
          </p>
        </LegalSection>
      </LegalLayout>
    </div>
  );
}

function methodLine(m: ShippingPolicyMethod): string {
  const price =
    m.priceMinor === 0
      ? 'ücretsiz'
      : m.priceMinor != null
        ? formatMinor(m.priceMinor)
        : m.type === 'desi'
          ? 'ağırlığa göre kademeli'
          : 'sepet tutarına göre kademeli';
  const threshold = m.thresholdMinor != null ? `; ${formatMinor(m.thresholdMinor)} ve üzeri siparişlerde ücretsiz` : '';
  const cod = m.type === 'kapıda' ? ' (kapıda ödeme hizmet bedeli ayrıca eklenir)' : '';
  const days = m.estimatedDays ? ` — tahmini ${m.estimatedDays}` : '';
  return `${m.name}: ${price}${threshold}${cod}${days}`;
}
