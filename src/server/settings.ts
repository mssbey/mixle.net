// Mağaza ayarları — `Setting` tablosu üzerinde tipli erişim.
//
// Her anahtarın varsayılanı burada tanımlıdır; tablo boşken de uygulama
// çalışır. Yazma tarafı F7'de (sekmeli ayarlar ekranı) genişler; F1 yalnız
// checkout'un ihtiyaç duyduğu anahtarları okur.

import 'server-only';
import { cache } from 'react';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';
import { db } from './db';

export const storeSettingsSchema = z.object({
  /** Fiyatlar KDV dahil mi (Türkiye perakendede evet). */
  pricesIncludeTax: z.boolean().default(true),
  /** Ürün bazında override yoksa uygulanan oran, on binde. */
  defaultTaxRateBps: z.number().int().min(0).max(10_000).default(2000),
  /** Kargo hizmeti KDV oranı, on binde. */
  shippingTaxRateBps: z.number().int().min(0).max(10_000).default(2000),
  /** Kapıda ödeme ek hizmet bedeli, kuruş. */
  codSurchargeMinor: z.number().int().min(0).default(1500),
  /** Kapıda ödeme için üst sipariş tutarı, kuruş (null = sınırsız). */
  codMaxTotalMinor: z.number().int().min(0).nullable().default(300_000),
  /** Checkout'ta stok rezervasyonu süresi, dakika. */
  reservationMinutes: z.number().int().min(5).max(120).default(30),
  /** Düşük stok uyarı eşiği (panel). */
  lowStockThreshold: z.number().int().min(0).default(5),
  /** Cayma hakkı süresi, gün. */
  withdrawalDays: z.number().int().min(0).default(14),
  currency: z.literal('TRY').default('TRY'),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;

export const storeInfoSchema = z.object({
  legalName: z.string().default('Mixle Lezzet Sepeti'),
  tradeName: z.string().default('Mixle Lezzet Sepeti'),
  address: z.string().default(''),
  city: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().default(''),
  taxOffice: z.string().default(''),
  taxNumber: z.string().default(''),
  mersisNo: z.string().default(''),
  /** Sipariş bildirimlerinin gideceği yönetici e-postası. */
  notifyEmail: z.string().default(''),
});

export type StoreInfo = z.infer<typeof storeInfoSchema>;

const KEYS = {
  store: 'magaza',
  info: 'magaza-bilgileri',
} as const;

// `z.output<S>`: `.default()` alanları çıktıda zorunludur; düz `ZodType<T>`
// generic'i giriş tipini (opsiyonel) yakalayıp her alanı `| undefined` yapıyordu.
async function readKey<S extends z.ZodTypeAny>(key: string, schema: S): Promise<z.output<S>> {
  const row = await db.setting.findUnique({ where: { key } });
  const parsed = schema.safeParse(row?.value ?? {});
  // Bozuk kayıt varsayılanı düşürmesin: geçersizse varsayılanlara dön.
  return parsed.success ? parsed.data : schema.parse({});
}

export const getStoreSettings = cache(() => readKey(KEYS.store, storeSettingsSchema));
export const getStoreInfo = cache(() => readKey(KEYS.info, storeInfoSchema));

export async function writeSetting(
  key: string,
  value: unknown,
  updatedByUserId: string | null,
): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value: value as Prisma.InputJsonValue, updatedByUserId },
    update: { value: value as Prisma.InputJsonValue, updatedByUserId },
  });
}

export const SETTING_KEYS = KEYS;
