import { describe, expect, it } from 'vitest';
import {
  ORDER_STATUSES,
  InvalidTransitionError,
  allowedTransitions,
  assertTransition,
  canTransition,
  derivedStatuses,
  effectsOf,
} from './state-machine';

describe('sipariş durum makinesi', () => {
  it('mutlu yol sırayla ilerler', () => {
    const path = [
      'taslak',
      'ödeme-bekliyor',
      'ödendi',
      'hazırlanıyor',
      'kargolandı',
      'teslim-edildi',
      'tamamlandı',
    ] as const;
    for (let i = 0; i < path.length - 1; i += 1) {
      expect(canTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it('kargolanmış sipariş iptal edilemez, iade gerekir', () => {
    expect(canTransition('kargolandı', 'iptal')).toBe(false);
    expect(canTransition('teslim-edildi', 'iptal')).toBe(false);
    expect(canTransition('teslim-edildi', 'iade-talebi')).toBe(true);
    expect(canTransition('iade-talebi', 'iade-edildi')).toBe(true);
  });

  it('kargolanmamış her aşamadan iptal mümkündür', () => {
    for (const from of ['taslak', 'ödeme-bekliyor', 'ödendi', 'hazırlanıyor'] as const) {
      expect(canTransition(from, 'iptal')).toBe(true);
    }
  });

  it('kapıda ödeme: ödeme beklerken hazırlığa geçer ve stok kesinleşir', () => {
    expect(canTransition('ödeme-bekliyor', 'hazırlanıyor')).toBe(true);
    expect(effectsOf('ödeme-bekliyor', 'hazırlanıyor').commitStock).toBe(true);
    // ödendi → hazırlanıyor geçişinde stok zaten kesinleşmiştir, tekrar yapılmaz
    expect(effectsOf('ödendi', 'hazırlanıyor').commitStock).toBe(false);
  });

  it('ödeme bekleyen başarısız olabilir, başarısızdan yeniden denenebilir', () => {
    expect(canTransition('ödeme-bekliyor', 'başarısız')).toBe(true);
    expect(canTransition('başarısız', 'ödeme-bekliyor')).toBe(true);
  });

  it('sonlanmış durumlardan çıkış yoktur', () => {
    expect(allowedTransitions('iptal')).toHaveLength(0);
    expect(allowedTransitions('iade-edildi')).toHaveLength(0);
  });

  it('geri gidiş yasaktır', () => {
    expect(canTransition('ödendi', 'ödeme-bekliyor')).toBe(false);
    expect(canTransition('kargolandı', 'hazırlanıyor')).toBe(false);
    expect(canTransition('tamamlandı', 'teslim-edildi')).toBe(false);
  });

  it('geçersiz geçiş 409 statülü Türkçe hata fırlatır', () => {
    expect(() => assertTransition('kargolandı', 'iptal')).toThrow(InvalidTransitionError);
    try {
      assertTransition('kargolandı', 'iptal');
    } catch (e) {
      const err = e as InvalidTransitionError;
      expect(err.status).toBe(409);
      expect(err.message).toContain('Kargolandı');
      expect(err.message).toContain('İptal edildi');
    }
  });

  it('her durumun tabloda bir girişi vardır', () => {
    for (const s of ORDER_STATUSES) {
      expect(Array.isArray(allowedTransitions(s))).toBe(true);
    }
  });

  it('yan etkiler doğru geçişte tetiklenir', () => {
    expect(effectsOf('ödeme-bekliyor', 'ödendi')).toMatchObject({
      commitStock: true,
      email: 'odeme-basarili',
      stamp: 'paidAt',
    });
    expect(effectsOf('ödendi', 'iptal')).toMatchObject({
      releaseStock: true,
      revokeCoupon: true,
      stamp: 'cancelledAt',
    });
    expect(effectsOf('ödendi', 'kargolandı').email).toBe('kargoya-verildi');
    expect(effectsOf('taslak', 'ödeme-bekliyor').email).toBe('siparis-alindi');
    expect(effectsOf('başarısız', 'ödeme-bekliyor').email).toBeNull();
  });

  it('türetilmiş ödeme/sevkiyat durumları tutarlıdır', () => {
    expect(derivedStatuses('kargolandı')).toEqual({
      paymentStatus: 'ödendi',
      fulfillmentStatus: 'gönderildi',
    });
    expect(derivedStatuses('başarısız')).toEqual({ paymentStatus: 'başarısız' });
    expect(derivedStatuses('taslak')).toEqual({});
  });
});
