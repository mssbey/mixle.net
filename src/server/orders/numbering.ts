// Sipariş numarası — NA-2026-000123.
//
// Atomik sayaç: `Counter` satırı transaction içinde artırılır. İki eşzamanlı
// sipariş aynı numarayı alamaz çünkü `update` satır kilidi alır; SQLite'ta
// yazma zaten tek, Postgres'te satır bazında kilitlenir.

import type { Prisma } from '@/generated/prisma/client';

export const ORDER_NUMBER_KEY = 'siparis-no';

export function formatOrderNumber(sequence: number, year = new Date().getUTCFullYear()): string {
  return `NA-${year}-${String(sequence).padStart(6, '0')}`;
}

export const ORDER_NUMBER_PATTERN = /^NA-\d{4}-\d{6}$/;

/** Transaction içinde çağrılır; sayaç yoksa oluşturur. */
export async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const row = await tx.counter.upsert({
    where: { key: ORDER_NUMBER_KEY },
    create: { key: ORDER_NUMBER_KEY, value: 1 },
    update: { value: { increment: 1 } },
  });
  return formatOrderNumber(row.value);
}
