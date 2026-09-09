// Vitrin kabuğunun (header / footer / mobil menü) ihtiyaç duyduğu iletişim
// bilgisi. Panel → Ayarlar → Mağaza'da kayıt varsa oradan, yoksa `site`
// içindeki placeholder'dan gelir. Sunucu layout'unda çözülüp client kabuğa
// düz (serialize edilebilir) prop olarak geçirilir.

import { site } from './site';

export interface StorefrontContact {
  phone: string;
  phoneUrl: string;
  email: string;
  emailUrl: string;
  whatsappUrl: string;
  address: string;
  workingHours: string;
  legalName: string;
}

interface StoreInfoLike {
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  legalName?: string;
  tradeName?: string;
}

const telHref = (raw: string) => `tel:${raw.replace(/[^\d+]/g, '')}`;

export function resolveStorefrontContact(info?: StoreInfoLike | null): StorefrontContact {
  const phone = info?.phone?.trim() || site.contact.phone;
  const email = info?.email?.trim() || site.contact.email;
  const address =
    [info?.address?.trim(), info?.city?.trim()].filter(Boolean).join(' · ') ||
    site.contact.addressLines.join(' · ');

  return {
    phone,
    phoneUrl: telHref(phone),
    email,
    emailUrl: `mailto:${email}`,
    whatsappUrl: site.contact.whatsappUrl,
    address,
    workingHours: site.contact.workingHours,
    legalName: info?.tradeName?.trim() || info?.legalName?.trim() || site.name,
  };
}
