import { describe, expect, it } from 'vitest';
import { renderEmailHtml } from './email-html';

const order = {
  orderNumber: '1001',
  items: [{ name: 'Santa <Mix>', variantLabel: '30 ml', imageUrl: '/api/medya/a.webp', quantity: 2, lineTotalMinor: 23_000 }],
  itemsSubtotalMinor: 23_000,
  discountTotalMinor: 1_150,
  shippingTotalMinor: 0,
  surchargeMinor: 0,
  grandTotalMinor: 21_850,
  paymentMethod: 'kart',
};

describe('HTML e-posta', () => {
  it('logo, başlık, sipariş tablosu ve buton içerir', () => {
    const html = renderEmailHtml({
      brand: { name: 'Mixle', url: 'https://mixle.net' },
      logoUrl: 'https://mixle.net/brand/logo.png',
      heading: 'Siparişiniz alındı',
      body: 'Merhaba,\n\nTakip: https://mixle.net/x',
      order,
      cta: { label: 'Siparişimi görüntüle', url: 'https://mixle.net/siparis-takibi?no=1001' },
    });
    expect(html).toContain('src="https://mixle.net/brand/logo.png"');
    expect(html).toContain('Sipariş: #1001');
    // Göreli ürün görseli mutlak adrese çevrilir; ad HTML'e kaçışlı yazılır.
    expect(html).toContain('src="https://mixle.net/api/medya/a.webp"');
    expect(html).toContain('Santa &lt;Mix&gt;');
    expect(html).toContain('×2');
    expect(html).toContain('İndirim:');
    expect(html).toContain('Ücretsiz');
    expect(html).toContain('href="https://mixle.net/x"');
    expect(html).toContain('Siparişimi görüntüle');
  });

  it('logo yoksa mağaza adı, sipariş yoksa tablo basılmaz', () => {
    const html = renderEmailHtml({ brand: { name: 'KanziVape', url: '' }, logoUrl: null, heading: 'Parola', body: 'x' });
    expect(html).toContain('KanziVape');
    expect(html).not.toContain('Sipariş: #');
  });
});
