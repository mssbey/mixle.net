// Ürün editöründe SEO başlığı/açıklaması için otomatik metin.
// Ad, kategori, tat profilleri, seçenek değerleri ve kısa açıklamadan kurulur;
// şemadaki sınırların (başlık 70, açıklama 180) altında kalır.

import type { AdminProduct, AdminSeo } from '@/types/admin';

const BRAND = 'Mixle';
const TITLE_MAX = 70;
const DESC_MAX = 160; // Google snippet'i ~160 karakterde keser; şema sınırı 180.

const lower = (s: string) => s.toLocaleLowerCase('tr-TR');

/** "a, b ve c" */
function joinTr(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}`;
}

function truncateWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
}

function firstSentence(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const m = clean.match(/^.+?[.!?](?=\s|$)/);
  const s = (m ? m[0] : clean).trim();
  return s && !/[.!?]$/.test(s) ? `${s}.` : s;
}

export interface SeoContext {
  categoryName: (id: string) => string;
  profileLabel: (id: string) => string;
}

export function buildProductSeo(product: AdminProduct, ctx: SeoContext): AdminSeo {
  const name = product.name.trim();
  if (!name) return { title: '', description: '' };

  const category = product.categoryIds.map(ctx.categoryName).find((c) => c && c.trim())?.trim() ?? '';
  const withCategory = category && !lower(name).includes(lower(category));

  // Başlık: "Ad - Kategori | Mixle"; sığmazsa kategori düşer, yine sığmazsa ad kısalır.
  let title = withCategory ? `${name} - ${category} | ${BRAND}` : `${name} | ${BRAND}`;
  if (title.length > TITLE_MAX) title = `${name} | ${BRAND}`;
  if (title.length > TITLE_MAX) title = `${truncateWords(name, TITLE_MAX - BRAND.length - 3)} | ${BRAND}`;

  const profiles = product.flavorProfiles.map((id) => lower(ctx.profileLabel(id))).filter(Boolean);
  const values = [
    ...new Set(product.options.flatMap((o) => o.values.map((v) => v.label.trim())).filter(Boolean)),
  ];

  // Öncelik sırasıyla cümleler; sınıra sığdığı kadarı eklenir.
  const sentences: string[] = [];
  const subject = withCategory ? `${name} ${lower(category)}` : name;
  sentences.push(profiles.length ? `${joinTr(profiles.slice(0, 3))} tat profiline sahip ${subject}.` : `${subject}.`);
  const short = firstSentence(product.shortDescription);
  if (short) sentences.push(short);
  if (values.length) sentences.push(`${joinTr(values.slice(0, 4))} seçenekleriyle ${BRAND}'de.`);
  sentences.push('Hızlı kargo ve güvenli ödemeyle hemen sipariş verin.');

  let description = '';
  for (const s of sentences) {
    const next = description ? `${description} ${s}` : s;
    if (next.length <= DESC_MAX) description = next;
    else if (!description) description = truncateWords(s, DESC_MAX);
  }

  return { title, description: description.charAt(0).toLocaleUpperCase('tr-TR') + description.slice(1) };
}
