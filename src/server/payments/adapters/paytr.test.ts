import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { paytrCallbackHash, paytrToken, type PaytrConfig } from './paytr';

const cfg: PaytrConfig = { merchantId: '123456', merchantKey: 'anahtar', merchantSalt: 'tuz', testMode: true };

describe('PayTR imzaları', () => {
  it('token = base64(HMAC-SHA256(key, id+ip+oid+email+amount+basket+noInst+maxInst+currency+test+salt))', () => {
    const fields = { userIp: '1.2.3.4', merchantOid: 'NA2026000001', email: 'a@b.c', paymentAmount: 12990, userBasket: 'W10=', noInstallment: 1, maxInstallment: 0, currency: 'TL', testMode: 1 };
    const expected = createHmac('sha256', 'anahtar').update('1234561.2.3.4NA2026000001a@b.c12990W10=10TL1tuz').digest('base64');
    expect(paytrToken(cfg, fields)).toBe(expected);
  });

  it('bildirim hash = base64(HMAC-SHA256(key, oid+salt+status+total))', () => {
    const expected = createHmac('sha256', 'anahtar').update('NA2026000001tuzsuccess12990').digest('base64');
    expect(paytrCallbackHash(cfg, 'NA2026000001', 'success', '12990')).toBe(expected);
    expect(paytrCallbackHash(cfg, 'NA2026000001', 'failed', '12990')).not.toBe(expected);
  });
});
