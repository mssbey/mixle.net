// E-posta kuyruğu ve şablonları.
//
// DEMO_MODE=true iken hiçbir şey gönderilmez: e-posta `EmailLog`'a
// "demo-yakalandı" durumuyla ve gövdesiyle yazılır, panelde görüntülenir.
// DEMO_MODE=false iken `mailer.ts::sendMailNow` ile GERÇEK gönderim denenir
// (SMTP/Resend, bkz. `/admin/ayarlar/eposta`); sonuç `EmailLog.status`e
// yazılır. Gönderim hatası ASLA çağıran işlemi (sipariş oluşturma vb.)
// düşürmez — try/catch ile yutulur, panelde "başarısız" olarak görünür.
//
// Şablonlar `{{degisken}}` yer tutucularıyla Türkçe metindir; değişkenler
// gönderim anında doldurulur. Kişisel veri (tam adres, TCKN) e-postaya konmaz.

import 'server-only';
import { db } from '../db';
import { DEMO_MODE } from '../config';
import { formatMinor } from '@/lib/money';
import { paymentMethodLabel } from '@/lib/payment-labels';
import { site } from '@/lib/site';

export type EmailTemplateKey =
  | 'siparis-alindi'
  | 'odeme-basarili'
  | 'odeme-basarisiz'
  | 'kargoya-verildi'
  | 'teslim-edildi'
  | 'iptal'
  | 'iade-onayi'
  | 'iade-talebi-onaylandi'
  | 'iade-talebi-reddedildi'
  | 'iade-tamamlandi'
  | 'parola-sifirla'
  | 'yeni-siparis-yonetici'
  | 'hesap-olusturuldu';

interface Template {
  subject: string;
  body: string;
}

const TEMPLATES: Record<EmailTemplateKey, Template> = {
  'siparis-alindi': {
    subject: 'Siparişiniz alındı — {{siparisNo}}',
    body: `Merhaba {{musteriAdi}},

{{siparisNo}} numaralı siparişinizi aldık. Ödemeniz onaylandığında hazırlamaya başlayacağız.

Sipariş toplamı: {{toplam}}
Ödeme yöntemi: {{odemeYontemi}}

{{odemeTalimati}}

Siparişinizi takip etmek için: {{takipLinki}}

Kabul ettiğiniz Mesafeli Satış Sözleşmesi (sürüm {{sozlesmeSurumu}}) ve Ön Bilgilendirme Formu bu e-postanın ekinde yer alır.

${site.name}`,
  },
  'odeme-basarili': {
    subject: 'Ödemeniz alındı — {{siparisNo}}',
    body: `Merhaba {{musteriAdi}},

{{siparisNo}} numaralı siparişinizin ödemesi ({{toplam}}) başarıyla alındı. Siparişiniz hazırlanıyor.

Takip: {{takipLinki}}

${site.name}`,
  },
  'odeme-basarisiz': {
    subject: 'Ödeme alınamadı — {{siparisNo}}',
    body: `Merhaba {{musteriAdi}},

{{siparisNo}} numaralı siparişiniz için ödeme alınamadı. Siparişiniz bekliyor; yeniden ödeme yapmak için: {{takipLinki}}

${site.name}`,
  },
  'kargoya-verildi': {
    subject: 'Siparişiniz kargoda — {{siparisNo}}',
    body: `Merhaba {{musteriAdi}},

{{siparisNo}} numaralı siparişiniz {{kargoFirmasi}} ile yola çıktı.
Takip numarası: {{kargoTakipNo}}
Takip linki: {{kargoTakipLinki}}

${site.name}`,
  },
  'teslim-edildi': {
    subject: 'Siparişiniz teslim edildi — {{siparisNo}}',
    body: `Merhaba {{musteriAdi}},

{{siparisNo}} numaralı siparişiniz teslim edildi. Keyifli kullanımlar!

Cayma hakkınız teslim tarihinden itibaren {{caymaGun}} gündür. İade talebi için: {{takipLinki}}

${site.name}`,
  },
  iptal: {
    subject: 'Siparişiniz iptal edildi — {{siparisNo}}',
    body: `Merhaba {{musteriAdi}},

{{siparisNo}} numaralı siparişiniz iptal edildi. Ödeme yaptıysanız iade işlemi başlatılmıştır.

${site.name}`,
  },
  'iade-onayi': {
    subject: 'İade talebiniz alındı — {{siparisNo}}',
    body: `Merhaba {{musteriAdi}},

{{siparisNo}} numaralı siparişiniz için iade talebiniz alındı. İnceleme sonucunu e-posta ile bildireceğiz.

${site.name}`,
  },
  'iade-talebi-onaylandi': {
    subject: 'İade talebiniz onaylandı — {{siparisNo}}',
    body: `Merhaba {{musteriAdi}},

{{siparisNo}} numaralı siparişiniz için iade talebiniz onaylandı.

{{iadeTalimati}}

Ürün elimize ulaştığında iade işleminizi tamamlayıp size bilgi vereceğiz.

${site.name}`,
  },
  'iade-talebi-reddedildi': {
    subject: 'İade talebiniz hakkında — {{siparisNo}}',
    body: `Merhaba {{musteriAdi}},

{{siparisNo}} numaralı siparişiniz için açtığınız iade talebini inceledik.

Sonuç: {{redSebebi}}

Sorularınız için bize ulaşabilirsiniz.

${site.name}`,
  },
  'iade-tamamlandi': {
    subject: 'İadeniz tamamlandı — {{siparisNo}}',
    body: `Merhaba {{musteriAdi}},

{{siparisNo}} numaralı siparişinizin iadesi tamamlandı. {{iadeTutari}} ödeme yönteminize iade edildi.

${site.name}`,
  },
  'parola-sifirla': {
    subject: 'Parola sıfırlama',
    body: `Merhaba,

Parolanızı sıfırlamak için bağlantı (1 saat geçerli): {{sifirlamaLinki}}

Bu isteği siz yapmadıysanız bu e-postayı yok sayın.

${site.name}`,
  },
  'yeni-siparis-yonetici': {
    subject: 'Yeni sipariş: {{siparisNo}} — {{toplam}}',
    body: `Yeni sipariş alındı.

No: {{siparisNo}}
Müşteri: {{musteriAdi}} ({{musteriEposta}})
Toplam: {{toplam}}
Ödeme: {{odemeYontemi}}

Panel: {{panelLinki}}`,
  },
  'hesap-olusturuldu': {
    subject: `${site.name} hesabınız oluşturuldu`,
    body: `Merhaba {{musteriAdi}},

Hesabınız oluşturuldu. Siparişlerinizi ve adreslerinizi {{hesapLinki}} adresinden yönetebilirsiniz.

${site.name}`,
  },
};

export type EmailVars = Record<string, string | number | null | undefined>;

export function renderTemplate(key: EmailTemplateKey, vars: EmailVars): Template {
  const fill = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
      const v = vars[name];
      return v == null ? '' : String(v);
    });
  const t = TEMPLATES[key];
  return { subject: fill(t.subject), body: fill(t.body).replace(/\n{3,}/g, '\n\n') };
}

export interface QueueEmailInput {
  to: string;
  template: EmailTemplateKey;
  vars: EmailVars;
  orderId?: string | null;
}

/**
 * E-postayı kuyruğa alır. Demo modda anında "yakalandı" olarak kaydedilir;
 * gerçek gönderim F7'de bu fonksiyonun içine bağlanır, çağrı yerleri değişmez.
 * Gönderim hatası asıl işlemi (sipariş oluşturma vb.) asla düşürmez.
 */
export async function queueEmail(input: QueueEmailInput): Promise<void> {
  const { subject, body } = renderTemplate(input.template, input.vars);
  let row: { id: string } | null = null;
  try {
    row = await db.emailLog.create({
      data: {
        to: input.to,
        template: input.template,
        subject,
        body,
        orderId: input.orderId ?? null,
        status: DEMO_MODE ? 'demo-yakalandı' : 'kuyrukta',
        sentAt: DEMO_MODE ? new Date() : null,
      },
      select: { id: true },
    });
  } catch (err) {
    console.error('[e-posta] kuyruğa yazılamadı:', err);
    return;
  }

  if (DEMO_MODE) return;
  try {
    const { sendMailNow } = await import('./mailer');
    const result = await sendMailNow(input.to, subject, body);
    await db.emailLog.update({
      where: { id: row.id },
      data: result.ok
        ? { status: 'gönderildi', sentAt: new Date() }
        : { status: 'başarısız', error: (result.error ?? 'bilinmeyen hata').slice(0, 500) },
    });
  } catch (err) {
    console.error('[e-posta] gönderim denemesi başarısız:', err);
    await db.emailLog.update({ where: { id: row.id }, data: { status: 'başarısız', error: 'Beklenmeyen hata' } }).catch(() => {});
  }
}

/** Sipariş e-postalarının ortak değişkenleri. */
export function orderEmailVars(order: {
  orderNumber: string;
  grandTotalMinor: number;
  paymentMethod: string;
  guestEmail: string | null;
  customer?: { firstName: string; lastName: string; email: string } | null;
  shippingAddress: unknown;
}): EmailVars {
  const addr = (order.shippingAddress ?? {}) as { firstName?: string; lastName?: string };
  const name =
    order.customer && (order.customer.firstName || order.customer.lastName)
      ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
      : `${addr.firstName ?? ''} ${addr.lastName ?? ''}`.trim() || 'Müşterimiz';
  const email = order.customer?.email ?? order.guestEmail ?? '';
  const base = site.domain;
  const takip = `${base}/siparis-takibi?no=${encodeURIComponent(order.orderNumber)}&eposta=${encodeURIComponent(email)}`;

  return {
    siparisNo: order.orderNumber,
    musteriAdi: name,
    musteriEposta: email,
    toplam: formatMinor(order.grandTotalMinor),
    odemeYontemi: paymentMethodLabel(order.paymentMethod),
    takipLinki: takip,
    panelLinki: `${base}/admin/siparisler`,
    hesapLinki: `${base}/hesabim`,
  };
}

export { paymentMethodLabel } from '@/lib/payment-labels';
