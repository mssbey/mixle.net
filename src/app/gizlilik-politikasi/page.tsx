import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası',
  description: `${site.name} gizlilik politikası ve KVKK aydınlatma metni (örnek içerik).`,
  alternates: { canonical: '/gizlilik-politikasi' },
};

export default function PrivacyPage() {
  return (
    <div className="container-page section !pt-8">
      <Breadcrumbs items={[{ label: 'Gizlilik Politikası' }]} />
      <LegalLayout title="Gizlilik Politikası" updated="Örnek belge — yayın tarihi eklenecek">
        <LegalSection title="1. Kapsam">
          <p>
            Bu belge, {site.name} web sitesinin bu sürümünde toplanan sınırlı verilerin nasıl işlendiğini
            açıklamak amacıyla hazırlanmış <strong>örnek</strong> bir metindir. Bu sürümde gerçek bir sunucu
            tarafı veri tabanı, ödeme sistemi veya üyelik altyapısı bulunmamaktadır.
          </p>
        </LegalSection>
        <LegalSection title="2. Tarayıcıda Saklanan Bilgiler">
          <p>
            Sepet, favoriler, son görüntülenen ürünler ve arama geçmişi gibi bilgiler yalnızca tarayıcınızın
            yerel depolama alanında (localStorage) tutulur. Bu bilgiler sunucularımıza iletilmez ve
            tarayıcı verilerinizi temizlediğinizde silinir.
          </p>
        </LegalSection>
        <LegalSection title="3. İletişim Formu">
          <p>
            İletişim ve değerlendirme formları bu demo sürümünde yalnızca frontend doğrulaması yapar;
            girilen bilgiler bir sunucuya veya üçüncü tarafa gönderilmez.
          </p>
        </LegalSection>
        <LegalSection title="4. Çerezler">
          <p>
            Çerez kullanımı hakkında ayrıntılı bilgi için{' '}
            <a href="/cerez-politikasi" className="font-semibold text-purple-700 link-underline">
              Çerez Politikası
            </a>{' '}
            sayfasını inceleyebilirsiniz.
          </p>
        </LegalSection>
        <LegalSection title="5. KVKK Aydınlatma Metni" id="kvkk">
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, gerçek bir üyelik ve sipariş
            sistemine geçildiğinde bu bölüm; veri sorumlusunun kimliği, işleme amaçları, aktarım koşulları
            ve ilgili kişi haklarını içerecek şekilde güncellenecektir. Bu sürümde kişisel veri toplayan bir
            sunucu bileşeni bulunmamaktadır.
          </p>
        </LegalSection>
        <LegalSection title="6. İletişim">
          <p>
            Sorularınız için {site.contact.email} adresinden bize ulaşabilirsiniz (örnek iletişim
            bilgisi).
          </p>
        </LegalSection>
      </LegalLayout>
    </div>
  );
}
