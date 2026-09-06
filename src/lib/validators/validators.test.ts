import { describe, expect, it } from 'vitest';
import { isValidTckn, maskTckn } from './tckn';
import { isValidVkn, maskVkn } from './vkn';
import { formatPhoneTR, isValidPhoneTR, maskPhoneInput, normalizePhoneTR } from './phone';

describe('TCKN', () => {
  it('bilinen geçerli örnek', () => {
    expect(isValidTckn('10000000146')).toBe(true);
    expect(isValidTckn('100 000 001 46')).toBe(true);
  });
  it('kontrol hanesi bozuksa geçersiz', () => {
    expect(isValidTckn('10000000147')).toBe(false);
    expect(isValidTckn('10000000156')).toBe(false);
  });
  it('biçim kuralları', () => {
    expect(isValidTckn('01000000146')).toBe(false); // 0 ile başlayamaz
    expect(isValidTckn('1000000014')).toBe(false); // 10 hane
    expect(isValidTckn('1000000014a')).toBe(false);
    expect(isValidTckn('')).toBe(false);
  });
  it('maskeleme', () => {
    expect(maskTckn('10000000146')).toBe('100*****46');
    expect(maskTckn('123')).toBe('***********');
  });
});

describe('VKN', () => {
  it('GİB algoritmasıyla geçerli örnek', () => {
    expect(isValidVkn('1234567890')).toBe(true);
  });
  it('kontrol hanesi bozuksa geçersiz', () => {
    expect(isValidVkn('1234567891')).toBe(false);
  });
  it('biçim', () => {
    expect(isValidVkn('123456789')).toBe(false);
    expect(isValidVkn('12345678901')).toBe(false);
    expect(isValidVkn('12345678ab')).toBe(false);
  });
  it('maskeleme', () => {
    expect(maskVkn('1234567890')).toBe('12******90');
  });
});

describe('telefon (TR)', () => {
  it('çeşitli girişleri E.164 biçimine çevirir', () => {
    expect(normalizePhoneTR('0532 123 45 67')).toBe('+905321234567');
    expect(normalizePhoneTR('5321234567')).toBe('+905321234567');
    expect(normalizePhoneTR('+90 (532) 123 45 67')).toBe('+905321234567');
    expect(normalizePhoneTR('90 532 123 45 67')).toBe('+905321234567');
  });
  it('sabit hat ve eksik numara reddedilir', () => {
    expect(isValidPhoneTR('0212 123 45 67')).toBe(false);
    expect(isValidPhoneTR('532 123 45')).toBe(false);
    expect(isValidPhoneTR('')).toBe(false);
  });
  it('görüntü biçimi', () => {
    expect(formatPhoneTR('+905321234567')).toBe('+90 (532) 123 45 67');
  });
  it('yazarken maske', () => {
    expect(maskPhoneInput('5')).toBe('(5');
    expect(maskPhoneInput('532')).toBe('(532)');
    expect(maskPhoneInput('5321')).toBe('(532) 1');
    expect(maskPhoneInput('05321234567')).toBe('(532) 123 45 67');
    expect(maskPhoneInput('905321234567999')).toBe('(532) 123 45 67');
  });
});
