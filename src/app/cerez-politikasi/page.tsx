import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Çerez Politikası',
  description: `${site.name} çerez kullanımı hakkında bilgilendirme.`,
  alternates: { canonical: '/cerez-politikasi' },
};

const rows = [
  { name: 'mixle-cart', purpose: 'Sepet içeriğinin tarayıcıda saklanması', duration: 'Kalıcı (tarayıcı temizlenene kadar)' },
  { name: 'mixle-favorites', purpose: 'Favori ürün listesinin saklanması', duration: 'Kalıcı' },
  { name: 'mixle-recent', purpose: 'Son görüntülenen ürünlerin saklanması', duration: 'Kalıcı' },
  { name: 'mixle-search-history', purpose: 'Son aramaların saklanması', duration: 'Kalıcı' },
  { name: 'na-announce-hidden', purpose: 'Duyuru bandının kapatılma tercihi', duration: 'Oturum' },
];

export default function CookiesPage() {
  return (
    <div className="container-page section !pt-8">
      <Breadcrumbs items={[{ label: 'Çerez Politikası' }]} />
      <LegalLayout title="Çerez Politikası" updated="Örnek belge">
        <LegalSection title="1. Genel Bilgi">
          <p>
            Bu sitede üçüncü taraf reklam veya takip çerezi kullanılmamaktadır. Aşağıdaki tabloda listelenen
            depolama anahtarları, tarayıcınızın <code>localStorage</code> / <code>sessionStorage</code>{' '}
            alanında tutulur ve sunucularımıza gönderilmez.
          </p>
        </LegalSection>
        <LegalSection title="2. Kullanılan Depolama Anahtarları">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-purple-200 text-xs uppercase tracking-wide text-ink-soft">
                  <th className="py-2 pr-4">Anahtar</th>
                  <th className="py-2 pr-4">Amaç</th>
                  <th className="py-2">Süre</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-b border-purple-100">
                    <td className="py-2 pr-4 font-mono text-xs">{r.name}</td>
                    <td className="py-2 pr-4">{r.purpose}</td>
                    <td className="py-2 text-ink-soft">{r.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LegalSection>
        <LegalSection title="3. Tercihlerinizi Yönetme">
          <p>
            Tarayıcınızın ayarlarından site verilerini temizleyerek yukarıdaki tüm bilgileri
            (sepet, favoriler, geçmiş) istediğiniz zaman silebilirsiniz.
          </p>
        </LegalSection>
      </LegalLayout>
    </div>
  );
}
