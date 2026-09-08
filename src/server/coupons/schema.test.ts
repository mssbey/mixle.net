import { describe, expect, it } from 'vitest';
import { couponInputSchema } from './schema';

const base = {
  code: 'test10',
  minCartTotalMinor: null,
  maxDiscountMinor: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  usageLimitPerCustomer: null,
  includeProductIds: [],
  excludeProductIds: [],
  includeCategoryIds: [],
  firstOrderOnly: false,
  isActive: true,
  stackable: false,
};

describe('couponInputSchema', () => {
  it('yüzde: 0 veya >10000 reddedilir, geçerli aralık kabul edilir', () => {
    expect(couponInputSchema.safeParse({ ...base, type: 'yüzde', value: 0 }).success).toBe(false);
    expect(couponInputSchema.safeParse({ ...base, type: 'yüzde', value: 10_001 }).success).toBe(false);
    expect(couponInputSchema.safeParse({ ...base, type: 'yüzde', value: 2000 }).success).toBe(true);
  });

  it('tutar: 0 reddedilir, pozitif kabul edilir', () => {
    expect(couponInputSchema.safeParse({ ...base, type: 'tutar', value: 0 }).success).toBe(false);
    expect(couponInputSchema.safeParse({ ...base, type: 'tutar', value: 5000 }).success).toBe(true);
  });

  it('ücretsiz-kargo: value kısıtı yoksayılır', () => {
    expect(couponInputSchema.safeParse({ ...base, type: 'ücretsiz-kargo', value: 0 }).success).toBe(true);
  });

  it('kod en az 2 karakter olmalı', () => {
    expect(couponInputSchema.safeParse({ ...base, code: 'a', type: 'tutar', value: 100 }).success).toBe(false);
  });
});
