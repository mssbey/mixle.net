'use client';

import { Tabs } from '@/components/ui/Tabs';
import { Accordion } from '@/components/ui/Accordion';
import { TasteRadar, TasteBars } from './TasteRadar';
import { FlavorTag } from '@/components/ui/FlavorTag';
import type { Product } from '@/types';

export function ProductInfoTabs({ product }: { product: Product }) {
  return (
    <Tabs
      items={[
        {
          id: 'aciklama',
          label: 'Ürün Açıklaması',
          content: (
            <div className="max-w-2xl space-y-4">
              <p>{product.longDescription}</p>
              <div className="flex flex-wrap gap-2">
                {product.flavorNotes.map((n) => (
                  <FlavorTag key={n.label} profile={n.profile} label={n.label} />
                ))}
              </div>
            </div>
          ),
        },
        {
          id: 'tat-profili',
          label: 'Tat Profili',
          content: (
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="hidden justify-center sm:flex">
                <TasteRadar taste={product.taste} />
              </div>
              <TasteBars taste={product.taste} />
            </div>
          ),
        },
        {
          id: 'kullanim',
          label: 'Kullanım Bilgileri',
          content: (
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ['Aroma kullanım oranı', product.usageRate],
                ['Önerilen bekleme süresi', product.steepTime],
                ['Ürün formu', formLabel(product.form)],
                ['Saklama', product.storage],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border border-line bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{k}</dt>
                  <dd className="mt-1 text-sm text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          ),
        },
        {
          id: 'teknik',
          label: 'Teknik Bilgiler',
          content: (
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ['Menşei', product.origin],
                ['İçerik bilgisi', product.ingredientsNote],
                ['Uyarılar', product.warnings],
                ['Kategori / Alt kategori', `${product.subcategory}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border border-line bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{k}</dt>
                  <dd className="mt-1 text-sm text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          ),
        },
        {
          id: 'teslimat',
          label: 'Teslimat & İade',
          content: (
            <div className="max-w-2xl space-y-3">
              <p>
                Siparişler ortalama olarak 1–3 iş günü içinde kargoya verilir (örnek bilgi). Kesin teslimat
                süreleri kampanya dönemlerinde değişebilir.
              </p>
              <p>
                Ambalajı açılmamış ürünler için iade koşulları{' '}
                <a href="/iade-ve-teslimat" className="font-semibold text-brand-500 link-underline">
                  İade ve Teslimat Koşulları
                </a>{' '}
                sayfasında yer alır.
              </p>
            </div>
          ),
        },
        {
          id: 'sss',
          label: 'Sıkça Sorulan Sorular',
          content: (
            <Accordion
              items={product.faq.map((f) => ({ title: f.question, content: f.answer }))}
              className="max-w-2xl border-line"
            />
          ),
        },
      ]}
    />
  );
}

function formLabel(f: Product['form']) {
  const map: Record<Product['form'], string> = {
    konsantre: 'Konsantre Aroma',
    shortfill: 'Shortfill',
    'diy-kit': 'DIY Kit',
    baz: 'Nbase (Baz)',
  };
  return map[f];
}
