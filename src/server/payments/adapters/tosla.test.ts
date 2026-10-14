import { describe, expect, it } from 'vitest';
import { toslaCallbackHash, toslaOrderId, toslaRequestHash, toslaTimeSpan, type ToslaConfig } from './tosla';

// Örnek değerler mewebstudio/pos ToslaPosCryptTest'ten (Tosla test hesabı).
const cfg: ToslaConfig = { clientId: '1000000494', apiUser: 'POS_ENT_Test_001', apiPass: 'POS_ENT_Test_001!*!*', testMode: true };

describe('Tosla imzaları', () => {
  it('istek hash = base64(SHA512(apiPass + clientId + apiUser + rnd + timeSpan))', () => {
    expect(toslaRequestHash(cfg, 'rand', '20231209201121')).toBe(
      'BwZ05tt0aNgIgtrrqmlTwSIaeetpQyyGLH6xTsQbHae7ANCIVKmLHPxYWk5XP3Li5fr4La1bZS9/43OihP0dig==',
    );
  });

  it('dönüş hash, HashParameters sırasıyla doğrulanır', () => {
    const fields = {
      ClientId: '1000000494',
      OrderId: '202312034E91',
      MdStatus: '1',
      ThreeDSessionId: 'P40D18956D9C94188ABF6C87B37075AF7B1029577C4BF4BADB8E86058919000F4',
      BankResponseCode: '00',
      BankResponseMessage: '',
      RequestStatus: '1',
      HashParameters: 'ClientId,ApiUser,OrderId,MdStatus,BankResponseCode,BankResponseMessage,RequestStatus',
    };
    const expected = 'CgibjWkLpfx+Cz6cVlbH1ViSW74ouKACVOW0Vrt2SfqPMt+V3hfIx/4LnOgcInFhPci/qcnIMgdN0RptHSmFOg==';
    expect(toslaCallbackHash(cfg, fields)).toBe(expected);
    expect(toslaCallbackHash(cfg, { ...fields, MdStatus: '' })).not.toBe(expected);
    expect(toslaCallbackHash(cfg, { ...fields, HashParameters: '' })).toBeNull();
  });

  it('timeSpan İstanbul saatiyle yyyyMMddHHmmss', () => {
    expect(toslaTimeSpan(new Date('2026-10-13T21:30:05Z'))).toBe('20261014003005');
  });

  it('orderId harf/rakam ve en fazla 20 karakter', () => {
    expect(toslaOrderId('NA-2026-000123-ab12cd34')).toBe('NA2026000123ab12cd34');
  });
});
