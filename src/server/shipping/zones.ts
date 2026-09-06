// Kargo bölgeleri ve yöntemleri — veritabanından tarife motoruna.
//
// `ShippingZone` / `ShippingMethod` tablolarını `shipping-rates.ts`'in saf
// kural tipine çevirir. Tablo boşsa varsayılan bir Türkiye bölgesi tohumlanır
// ki checkout ilk günden çalışsın; panel (F4) bunları düzenler.

import 'server-only';
import { cache } from 'react';
import type { Prisma } from '@/generated/prisma/client';
import { db } from '../db';
import { jsonArray } from '../catalog/mapping';
import type { RateTier, ShippingMethodRule, ShippingZoneRule } from '../pricing/shipping-rates';

const DEFAULT_ZONE = {
  id: 'zone-turkiye',
  name: 'Türkiye',
  countries: ['TR'],
  cities: [] as string[],
  sortOrder: 0,
};

const DEFAULT_METHODS = [
  {
    id: 'method-standart',
    name: 'Standart kargo',
    type: 'sabit',
    priceMinor: 5490,
    freeOverMinor: 75_000,
    tiers: null,
    estimatedDays: '1-3 iş günü',
    carrier: 'yurtici',
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'method-kapida',
    name: 'Kapıda ödeme ile kargo',
    type: 'kapıda',
    priceMinor: 5490,
    freeOverMinor: null,
    tiers: null,
    estimatedDays: '1-3 iş günü',
    carrier: 'yurtici',
    isActive: true,
    sortOrder: 1,
  },
];

/** Tablo boşsa varsayılan bölge + yöntemleri yazar. Idempotent. */
export async function ensureDefaultShipping(): Promise<void> {
  const count = await db.shippingZone.count();
  if (count > 0) return;

  await db.shippingZone.create({
    data: {
      ...DEFAULT_ZONE,
      countries: DEFAULT_ZONE.countries,
      cities: DEFAULT_ZONE.cities,
      methods: {
        create: DEFAULT_METHODS.map((m) => ({
          ...m,
          tiers: m.tiers === null ? undefined : (m.tiers as Prisma.InputJsonValue),
        })),
      },
    },
  });
}

function toMethodRule(row: {
  id: string;
  zoneId: string;
  name: string;
  type: string;
  priceMinor: number;
  freeOverMinor: number | null;
  tiers: unknown;
  estimatedDays: string;
  carrier: string | null;
  isActive: boolean;
  sortOrder: number;
}): ShippingMethodRule {
  return {
    id: row.id,
    zoneId: row.zoneId,
    name: row.name,
    type: row.type as ShippingMethodRule['type'],
    priceMinor: row.priceMinor,
    freeOverMinor: row.freeOverMinor,
    tiers: row.tiers == null ? null : jsonArray<RateTier>(row.tiers),
    estimatedDays: row.estimatedDays,
    carrier: row.carrier,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export const getShippingZones = cache(async (): Promise<ShippingZoneRule[]> => {
  await ensureDefaultShipping();
  const zones = await db.shippingZone.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { methods: { orderBy: { sortOrder: 'asc' } } },
  });
  return zones.map((z) => ({
    id: z.id,
    name: z.name,
    countries: jsonArray<string>(z.countries),
    cities: jsonArray<string>(z.cities),
    sortOrder: z.sortOrder,
    methods: z.methods.map(toMethodRule),
  }));
});
