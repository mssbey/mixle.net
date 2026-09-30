// Toplu fiyat güncelleme — belirli ürünler, kategoriler ya da tüm katalog için
// yüzde indirim / yüzde zam / indirimi kaldır. Saf fonksiyonlar: hem sunucu
// (/api/admin/products/fiyat) hem de testler kullanır.

import { z } from 'zod';

export type PriceMode = 'indirim' | 'zam' | 'indirim-kaldir';
export type PriceScope = 'secili' | 'kategori' | 'tumu';

export const priceAdjustSchema = z
  .object({
    scope: z.enum(['secili', 'kategori', 'tumu']),
    ids: z.array(z.string().min(1)).default([]),
    categoryIds: z.array(z.string().min(1)).default([]),
    mode: z.enum(['indirim', 'zam', 'indirim-kaldir']),
    percent: z.number().min(0).max(500).default(0),
    /** Yeni fiyatı tam liraya yuvarla (ör. 224,91 → 225,00). */
    roundLira: z.boolean().default(false),
    /** true ise yazmaz, yalnızca etkilenecek kayıt sayısını döner. */
    dryRun: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.scope === 'secili' && v.ids.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ürün seçilmedi', path: ['ids'] });
    }
    if (v.scope === 'kategori' && v.categoryIds.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Kategori seçilmedi', path: ['categoryIds'] });
    }
    if (v.mode !== 'indirim-kaldir' && v.percent <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Yüzde 0’dan büyük olmalı', path: ['percent'] });
    }
    if (v.mode === 'indirim' && v.percent >= 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'İndirim %100’den küçük olmalı', path: ['percent'] });
    }
  });

export type PriceAdjustInput = z.input<typeof priceAdjustSchema>;

export interface VariantPrice {
  priceMinor: number;
  compareAtPriceMinor: number | null;
}

function round(minor: number, roundLira: boolean): number {
  return roundLira ? Math.round(minor / 100) * 100 : Math.round(minor);
}

/**
 * Tek varyantın yeni fiyatı.
 *
 * - indirim: indirim her zaman ORİJİNAL fiyattan hesaplanır (zaten indirimliyse
 *   üstüne binmez); orijinal fiyat üstü çizili "eski fiyat" olarak kalır.
 * - zam: satış fiyatı ve varsa üstü çizili fiyat aynı oranda artar.
 * - indirim-kaldir: üstü çizili fiyat satış fiyatına geri döner.
 */
export function adjustPrice(
  v: VariantPrice,
  mode: PriceMode,
  percent: number,
  roundLira = false,
): VariantPrice {
  const onSale = v.compareAtPriceMinor != null && v.compareAtPriceMinor > v.priceMinor;

  if (mode === 'indirim-kaldir') {
    return { priceMinor: onSale ? (v.compareAtPriceMinor as number) : v.priceMinor, compareAtPriceMinor: null };
  }

  if (mode === 'indirim') {
    const base = onSale ? (v.compareAtPriceMinor as number) : v.priceMinor;
    const price = round((base * (100 - percent)) / 100, roundLira);
    // Yuvarlama indirimi yok ettiyse eski fiyat gösterilmez.
    return price < base ? { priceMinor: price, compareAtPriceMinor: base } : { priceMinor: base, compareAtPriceMinor: null };
  }

  const factor = (100 + percent) / 100;
  return {
    priceMinor: round(v.priceMinor * factor, roundLira),
    compareAtPriceMinor: onSale ? round((v.compareAtPriceMinor as number) * factor, roundLira) : null,
  };
}

/** Seçilen kategoriler + tüm alt kategorileri (döngüye karşı korumalı). */
export function withDescendants(
  categories: { id: string; parentId: string | null }[],
  roots: string[],
): string[] {
  const out = new Set(roots);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parentId && out.has(c.parentId) && !out.has(c.id)) {
        out.add(c.id);
        grew = true;
      }
    }
  }
  return [...out];
}
