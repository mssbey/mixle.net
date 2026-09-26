// Tat profili listesi — `Setting` tablosunda `tat-profilleri` anahtarı.
// Önbellek deseni `server/content/settings.ts` ile aynı (unstable_cache + etiket).

import 'server-only';
import { cache } from 'react';
import { revalidateTag, unstable_cache } from 'next/cache';
import type { Prisma } from '@/generated/prisma/client';
import { db } from '../db';
import {
  DEFAULT_FLAVOR_PROFILES,
  flavorProfileListSchema,
  type FlavorProfileDef,
} from '@/lib/flavor-profiles';

const KEY = 'tat-profilleri';
const TAG = 'tat-profilleri';

async function readFromDb(): Promise<FlavorProfileDef[]> {
  const row = await db.setting.findUnique({ where: { key: KEY } });
  const parsed = flavorProfileListSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : DEFAULT_FLAVOR_PROFILES;
}

const loadFlavorProfiles = unstable_cache(readFromDb, ['tat-profilleri-liste'], { tags: [TAG] });

/** Vitrin okuması — önbellekli. */
export const getFlavorProfiles = cache(loadFlavorProfiles);

/** Panel okuması — önbelleksiz, kayıttan hemen sonra tazedir. */
export const getFlavorProfilesFresh = readFromDb;

export async function saveFlavorProfiles(
  raw: unknown,
  updatedByUserId: string,
): Promise<FlavorProfileDef[]> {
  const list = flavorProfileListSchema.parse(raw);
  await db.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: list as unknown as Prisma.InputJsonValue, updatedByUserId },
    update: { value: list as unknown as Prisma.InputJsonValue, updatedByUserId },
  });
  revalidateTag(TAG, 'max');
  return list;
}
