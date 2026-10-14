import { describe, expect, it } from 'vitest';
import { formatOrderNumber, ORDER_NUMBER_PATTERN } from '@/server/orders/numbering';
import { isStoreId, storeSettingKey } from './stores';

describe('mağaza ayrımı', () => {
  it('Mixle ayar anahtarları öneksiz kalır, diğer mağazalar önek alır', () => {
    expect(storeSettingKey('mixle', 'odeme')).toBe('odeme');
    expect(storeSettingKey('nuclear', 'odeme')).toBe('nuclear:odeme');
    expect(storeSettingKey('kanzi', 'odeme')).toBe('kanzi:odeme');
  });

  it('Mixle düz numara, diğer mağazalar önek taşır', () => {
    expect(formatOrderNumber(1001, 2026)).toBe('1001');
    expect(ORDER_NUMBER_PATTERN.test('1001')).toBe(true);
    expect(ORDER_NUMBER_PATTERN.test('12')).toBe(false);
    expect(formatOrderNumber(123, 2026, 'nuclear')).toBe('NL-2026-000123');
    expect(formatOrderNumber(123, 2026, 'kanzi')).toBe('KV-2026-000123');
    expect(ORDER_NUMBER_PATTERN.test('NL-2026-000123')).toBe(true);
    expect(ORDER_NUMBER_PATTERN.test('NA-2026-000123')).toBe(true);
  });

  it('bilinmeyen mağaza kimliğini reddeder', () => {
    expect(isStoreId('nuclear')).toBe(true);
    expect(isStoreId('baska')).toBe(false);
    expect(isStoreId(undefined)).toBe(false);
  });
});
