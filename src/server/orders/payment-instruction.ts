// "Sipariş alındı" e-postasının ödeme yöntemine göre değişen metinleri.
// Sipariş oluşturma ve panelden yeniden gönderme aynı metni kullanır.

import 'server-only';
import { getStoreInfo } from '../settings';
import { getPaymentSettings, havaleDetails, havaleText } from '../payments/settings';
import type { EmailVars } from '../notifications/email';

/** `siparisDurumu` (selamlamadan sonraki cümle) ve `odemeTalimati` (sipariş özetinin altı). */
export async function paymentEmailVars(method: string): Promise<EmailVars> {
  switch (method) {
    case 'havale': {
      // Banka bilgisi ve açıklama metni Panel > Ödemeler > Havale/EFT'den gelir.
      const details = havaleDetails(await getPaymentSettings());
      const text = havaleText(details);
      const info = await getStoreInfo();
      return {
        siparisDurumu: 'Siparişinizi aldık ve ödemenizin işlendiğini onaylayana kadar siparişiniz şu anda beklemede.',
        odemeTalimati: details.iban
          ? text
          : [text, `Banka bilgilerimiz için ${info.legalName} ile iletişime geçebilirsiniz.`].filter(Boolean).join('\n\n'),
      };
    }
    case 'kapida':
      return {
        siparisDurumu: 'Siparişinizi aldık ve hazırlamaya başlıyoruz.',
        odemeTalimati: 'Ödemeyi teslimat sırasında kuryeye nakit veya kartla yapabilirsiniz.',
      };
    default:
      return {
        siparisDurumu: 'Siparişinizi aldık. Ödemeniz onaylandığında siparişinizi hazırlamaya başlayacağız.',
        odemeTalimati: '',
      };
  }
}
