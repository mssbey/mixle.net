// Panelden düzenlenebilir site içeriği — SSS ve ana sayfa kampanya bandı.
//
// Mevcut `Setting` anahtar-değer tablosu kullanılır (yeni model gerekmez).
// Kayıt yoksa `src/data/content.ts`'teki statik varsayılan döner — vitrin
// admin hiç düzenlemese de her zaman içerik gösterir; ilk kayıttan sonra DB
// devreye girer. Diğer içerik (rehber konuları, yorumlar, süreç adımları,
// hakkımızda) bilinçli olarak bu kapsamın dışındadır — bkz. README "Kapsam dışı".
//
// Önbellek: `catalog/queries.ts` ile AYNI desen — `unstable_cache` + `revalidateTag`
// (`cacheComponents` kapalıyken belgelerin önerdiği yol). Düz bir Prisma
// okuması `revalidatePath` ile geçersiz kılınmaz (denendi, çalışmadı — Full
// Route Cache yalnız `fetch`/`unstable_cache` çıktısını izler); bu yüzden
// `/sss` ve `/` içeriği burada olduğu gibi ETİKETLİ önbelleğe alınmalı.
// Not: `revalidateTag` "isteğe bağlı yeniden doğrulama"dır — panelden kayıttan
// hemen sonraki TEK bir istek nadiren henüz eski içeriği görebilir, bir
// sonraki istek her zaman tazedir (bkz. `scripts/admin-orders-smoke.mts`
// `fetchUntil`). Gerçek kullanımda (yönetici kaydeder, ziyaretçi dakikalar
// sonra bakar) bunun pratik bir etkisi yoktur.

import 'server-only';
import { cache } from 'react';
import { revalidateTag, unstable_cache } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { faqGroups as defaultFaqGroups, campaign as defaultCampaign } from '@/data/content';

export const faqContentSchema = z.object({
  groups: z
    .array(
      z.object({
        heading: z.string().trim().min(1, 'Başlık gerekli').max(80),
        items: z.array(z.object({ q: z.string().trim().min(1, 'Soru gerekli').max(300), a: z.string().trim().min(1, 'Cevap gerekli').max(2000) })).max(30),
      }),
    )
    .max(20),
});
export type FaqContent = z.output<typeof faqContentSchema>;

export const campaignContentSchema = z.object({
  eyebrow: z.string().trim().max(40).default(''),
  title: z.string().trim().min(1, 'Başlık gerekli').max(120),
  description: z.string().trim().max(400).default(''),
  code: z.string().trim().max(30).default(''),
  codeNote: z.string().trim().max(200).default(''),
  cta: z.object({ label: z.string().trim().min(1).max(40), href: z.string().trim().min(1).max(200) }),
  image: z.string().trim().min(1, 'Görsel gerekli').max(300),
});
export type CampaignContent = z.output<typeof campaignContentSchema>;

const KEYS = { faq: 'sayfa-sss', campaign: 'sayfa-kampanya' } as const;
const FAQ_TAG = 'sayfa-sss';
const CAMPAIGN_TAG = 'sayfa-kampanya';

const loadFaq = unstable_cache(
  async (): Promise<FaqContent> => {
    const row = await db.setting.findUnique({ where: { key: KEYS.faq } });
    const parsed = faqContentSchema.safeParse(row?.value);
    return parsed.success ? parsed.data : { groups: defaultFaqGroups };
  },
  ['sayfa-sss-icerik'],
  { tags: [FAQ_TAG] },
);
/** İstek başına teklenir, istekler arası `revalidateTag` ile geçersiz kılınana dek önbelleklenir. */
export const getFaqContent = cache(loadFaq);

const loadCampaign = unstable_cache(
  async (): Promise<CampaignContent> => {
    const row = await db.setting.findUnique({ where: { key: KEYS.campaign } });
    const parsed = campaignContentSchema.safeParse(row?.value);
    return parsed.success ? parsed.data : defaultCampaign;
  },
  ['sayfa-kampanya-icerik'],
  { tags: [CAMPAIGN_TAG] },
);
export const getCampaignContent = cache(loadCampaign);

export async function saveFaqContent(raw: unknown, updatedByUserId: string): Promise<FaqContent> {
  const parsed = faqContentSchema.parse(raw);
  await db.setting.upsert({
    where: { key: KEYS.faq },
    create: { key: KEYS.faq, value: parsed as never, updatedByUserId },
    update: { value: parsed as never, updatedByUserId },
  });
  revalidateTag(FAQ_TAG, 'max');
  return parsed;
}

export async function saveCampaignContent(raw: unknown, updatedByUserId: string): Promise<CampaignContent> {
  const parsed = campaignContentSchema.parse(raw);
  await db.setting.upsert({
    where: { key: KEYS.campaign },
    create: { key: KEYS.campaign, value: parsed as never, updatedByUserId },
    update: { value: parsed as never, updatedByUserId },
  });
  revalidateTag(CAMPAIGN_TAG, 'max');
  return parsed;
}

export const CONTENT_SETTING_KEYS = KEYS;
