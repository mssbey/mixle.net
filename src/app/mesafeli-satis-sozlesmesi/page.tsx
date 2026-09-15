import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Mesafeli Satış Sözleşmesi',
  description: 'Örnek mesafeli satış sözleşmesi metni.',
  alternates: { canonical: '/mesafeli-satis-sozlesmesi' },
};

export default function DistanceSalesPage() {
  return (
    <div className="container-page section !pt-8">
      <Breadcrumbs items={[{ label: 'Mesafeli Satış Sözleşmesi' }]} />
      <LegalLayout title="Mesafeli Satış Sözleşmesi" updated="Örnek belge — gerçek sipariş sistemi devreye alındığında güncellenecektir">
        <LegalSection title="1. Taraflar">
          <p>
            İşbu sözleşme, “Satıcı” olarak {site.name} ile siparişi veren “Alıcı” arasında, alıcının
            elektronik ortamda onayladığı siparişe ilişkin koşulları düzenlemek amacıyla örnek olarak
            hazırlanmıştır. Bu sürümde gerçek bir sipariş/ödeme altyapısı bulunmadığından sözleşme
            bilgilendirme amaçlıdır.
          </p>
        </LegalSection>
        <LegalSection title="2. Konu">
          <p>
            Sözleşmenin konusu, Alıcının Satıcıya ait internet sitesinden elektronik ortamda sipariş
            verdiği ürünlerin satışı ve teslimi ile ilgili tarafların hak ve yükümlülüklerinin belirlenmesidir.
          </p>
        </LegalSection>
        <LegalSection title="3. Ürün ve Ödeme Bilgileri">
          <p>
            Ürün adı, adedi, satış bedeli ve varyasyon bilgileri sipariş onay ekranında yer alır. Bu demo
            sürümde gerçek bir ödeme işlemi gerçekleştirilmez; “Siparişi Tamamla” adımı bilgilendirme
            ekranına yönlendirir.
          </p>
        </LegalSection>
        <LegalSection title="4. Cayma Hakkı">
          <p>
            Alıcı, teslim tarihinden itibaren 14 (on dört) gün içinde herhangi bir gerekçe göstermeksizin
            ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir (örnek koşul). Ambalajı açılmış,
            hijyenik nitelikteki ürünlerde cayma hakkı sınırlı olabilir; kesin koşullar için{' '}
            <a href="/iade-ve-teslimat" className="font-semibold text-purple-700 link-underline">
              İade ve Teslimat Koşulları
            </a>{' '}
            sayfasına bakınız.
          </p>
        </LegalSection>
        <LegalSection title="5. Yürürlük">
          <p>
            Alıcı, siparişini onaylayarak işbu sözleşmenin tüm koşullarını kabul etmiş sayılır. Sorularınız
            için {site.contact.email} adresinden ulaşabilirsiniz (örnek iletişim bilgisi).
          </p>
        </LegalSection>
      </LegalLayout>
    </div>
  );
}
