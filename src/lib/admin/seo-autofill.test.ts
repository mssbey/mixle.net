import { describe, expect, it } from 'vitest';
import type { AdminProduct } from '@/types/admin';
import { buildProductSeo, descriptionLead } from './seo-autofill';

const base = { name: 'Banana Cheesecake Mix Aroma', description: '', categoryIds: [], flavorProfiles: [] };
const p = (patch: Partial<AdminProduct>) => ({ ...base, ...patch }) as AdminProduct;

describe('SEO otomatik doldurma', () => {
  const desc = [
    'Banana Cheesecake Mix Aroma',
    'Banana Cheesecake Mix Aroma, lezzetli bir tatlı olan muzlu kremalı çizkeği sevenler için mükemmel bir seçenektir.',
    'Bu muhteşem aroma, tatlı bir muzlu kremalı çizkekin tadını içermektedir.',
    '',
    'İçerik;',
    'BANANA ( TFA) = MUZ',
  ].join('\n');

  it('başlık ürün adıdır', () => {
    expect(buildProductSeo(p({ description: desc })).title).toBe('Banana Cheesecake Mix Aroma');
  });

  it('açıklama, ad satırını ve İçerik listesini atlayıp giriş cümlelerinden gelir', () => {
    const d = buildProductSeo(p({ description: desc })).description;
    expect(d.startsWith('Banana Cheesecake Mix Aroma, lezzetli bir tatlı')).toBe(true);
    expect(d).not.toContain('MUZ');
    expect(d.length).toBeLessThanOrEqual(160);
  });

  it('biçim işaretlerini temizler', () => {
    expect(descriptionLead('## Başlık\n**Yoğun** fıstık ezmesi.', 'Başlık')).toBe('Yoğun fıstık ezmesi.');
  });

  it('açıklama yoksa ad ve kategoriden cümle kurar', () => {
    const d = buildProductSeo(p({ description: '', categoryIds: ['c'] }), { categoryName: () => 'Mix Aromalar' }).description;
    expect(d).toContain('Banana Cheesecake Mix Aroma mix aromalar.');
  });
});
