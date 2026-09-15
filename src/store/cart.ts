'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine } from '@/types';

const PROMO_CODES: Record<string, { type: 'percent' | 'amount'; value: number; label: string }> = {
  NEFIS10: { type: 'percent', value: 0.1, label: '%10 indirim' },
  ILKAROMA: { type: 'amount', value: 60, label: '60 ₺ indirim' },
  GOLDENDROP: { type: 'percent', value: 0.15, label: '%15 Golden Drop indirimi' },
};

interface CartState {
  lines: CartLine[];
  promo: string | null;
  add: (productId: string, variantId: string, qty?: number) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  changeVariant: (key: string, nextVariantId: string) => void;
  clear: () => void;
  applyPromo: (code: string) => { ok: boolean; message: string };
  removePromo: () => void;
  count: () => number;
}

const keyOf = (productId: string, variantId: string) => `${productId}::${variantId}`;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      promo: null,
      add: (productId, variantId, qty = 1) =>
        set((state) => {
          const key = keyOf(productId, variantId);
          const existing = state.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.key === key ? { ...l, qty: Math.min(l.qty + qty, 99) } : l,
              ),
            };
          }
          return {
            lines: [...state.lines, { key, productId, variantId, qty, addedAt: Date.now() }],
          };
        }),
      remove: (key) => set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),
      setQty: (key, qty) =>
        set((state) => ({
          lines:
            qty <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(qty, 99) } : l)),
        })),
      changeVariant: (key, nextVariantId) =>
        set((state) => {
          const line = state.lines.find((l) => l.key === key);
          if (!line) return state;
          const nextKey = keyOf(line.productId, nextVariantId);
          const already = state.lines.find((l) => l.key === nextKey);
          return {
            lines: state.lines
              .filter((l) => l.key !== key)
              .map((l) =>
                l.key === nextKey ? { ...l, qty: Math.min(l.qty + line.qty, 99) } : l,
              )
              .concat(
                already
                  ? []
                  : [{ ...line, key: nextKey, variantId: nextVariantId }],
              ),
          };
        }),
      clear: () => set({ lines: [], promo: null }),
      applyPromo: (code) => {
        const normalized = code.trim().toUpperCase();
        if (!normalized) return { ok: false, message: 'Bir kod girin.' };
        if (!PROMO_CODES[normalized]) return { ok: false, message: 'Bu kod geçerli değil.' };
        set({ promo: normalized });
        return { ok: true, message: `Kod uygulandı: ${PROMO_CODES[normalized].label}` };
      },
      removePromo: () => set({ promo: null }),
      count: () => get().lines.reduce((sum, l) => sum + l.qty, 0),
    }),
    { name: 'mixle-cart', version: 1 },
  ),
);

export function promoInfo(code: string | null) {
  if (!code) return null;
  return PROMO_CODES[code] ?? null;
}
