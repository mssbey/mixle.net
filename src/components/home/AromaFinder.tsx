'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, m } from 'framer-motion';
import { RefreshCw, Share2, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import type { FlavorProfile, Product } from '@/types';
import { currency } from '@/lib/site';
import { toast } from '@/store/toast';
import { cn } from '@/lib/utils';

interface Choice {
  label: string;
  profiles?: Partial<Record<FlavorProfile, number>>;
  freshness?: number;
  sweetness?: number;
  mixOnly?: boolean;
}
interface Question {
  q: string;
  choices: Choice[];
}

const questions: Question[] = [
  {
    q: 'Hangi tat ailesini seviyorsun?',
    choices: [
      { label: 'Meyveli', profiles: { meyveli: 3, eksi: 1 } },
      { label: 'Ferah & buzlu', profiles: { ferah: 3, mentollu: 1 }, freshness: 8 },
      { label: 'Tatlı & kremsi', profiles: { tatli: 3, kremsi: 2 }, sweetness: 8 },
      { label: 'İçecek & tütün', profiles: { icecek: 3, tutun: 2 } },
    ],
  },
  {
    q: 'Ferahlık seviyesi nasıl olsun?',
    choices: [
      { label: 'Neredeyse yok', freshness: 1 },
      { label: 'Hafif serinlik', freshness: 4 },
      { label: 'Belirgin ferah', freshness: 7, profiles: { ferah: 2 } },
      { label: 'Buz gibi', freshness: 10, profiles: { ferah: 2, mentollu: 2 } },
    ],
  },
  {
    q: 'Tek aroma mı, karışım mı?',
    choices: [
      { label: 'Tek notaya yakın, sade' },
      { label: 'Dengeli bir karışım', mixOnly: true },
      { label: 'Fark etmez' },
    ],
  },
  {
    q: 'Tatlılık seviyesi nedir?',
    choices: [
      { label: 'Düşük', sweetness: 2 },
      { label: 'Orta', sweetness: 5 },
      { label: 'Yüksek', sweetness: 8, profiles: { tatli: 2 } },
      { label: 'Çok tatlı / şekerli', sweetness: 10, profiles: { tatli: 3, kremsi: 1 } },
    ],
  },
  {
    q: 'Kullanım tercihin nedir?',
    choices: [
      { label: 'Gün boyu, yormayan', freshness: 6 },
      { label: 'Akşam, doygun', profiles: { tutun: 2, kremsi: 2, tatli: 1 } },
      { label: 'Kendi tarifimi kurmak', profiles: { meyveli: 1 } },
      { label: 'Hazır ve pratik', mixOnly: true },
    ],
  },
];

function recommend(picks: (Choice | null)[], products: Product[]): Product[] {
  const profileWeights: Partial<Record<FlavorProfile, number>> = {};
  let freshTarget: number | null = null;
  let sweetTarget: number | null = null;
  let preferMix = false;

  picks.forEach((c) => {
    if (!c) return;
    for (const [k, v] of Object.entries(c.profiles ?? {})) {
      profileWeights[k as FlavorProfile] = (profileWeights[k as FlavorProfile] ?? 0) + (v as number);
    }
    if (typeof c.freshness === 'number') freshTarget = freshTarget === null ? c.freshness : (freshTarget + c.freshness) / 2;
    if (typeof c.sweetness === 'number') sweetTarget = sweetTarget === null ? c.sweetness : (sweetTarget + c.sweetness) / 2;
    if (c.mixOnly) preferMix = true;
  });

  return [...products]
    .map((p) => {
      let score = 0;
      for (const [k, w] of Object.entries(profileWeights)) {
        if (p.flavorProfiles.includes(k as FlavorProfile)) score += w as number;
      }
      if (freshTarget !== null) score += 4 - Math.min(4, Math.abs(p.taste.freshness - freshTarget) / 2);
      if (sweetTarget !== null) score += 4 - Math.min(4, Math.abs(p.taste.sweetness - sweetTarget) / 2);
      if (preferMix && (p.category === 'mix' || p.form === 'diy-kit')) score += 3;
      score += p.rating / 3;
      if (p.stockStatus === 'out-of-stock') score -= 5;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.p);
}

export function AromaFinder({ products, compact = false }: { products: Product[]; compact?: boolean }) {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<(Choice | null)[]>(Array(questions.length).fill(null));
  const done = step >= questions.length;
  const results = useMemo(() => (done ? recommend(picks, products) : []), [done, picks, products]);

  const choose = (choice: Choice) => {
    setPicks((prev) => {
      const next = [...prev];
      next[step] = choice;
      return next;
    });
    setTimeout(() => setStep((s) => s + 1), 180);
  };

  const restart = () => {
    setPicks(Array(questions.length).fill(null));
    setStep(0);
  };

  const share = async () => {
    const text = `Nefis Aroma önerim: ${results.map((r) => r.name).join(', ')}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Nefis Aroma', text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success('Kopyalandı', 'Sonucu istediğin yere yapıştırabilirsin.');
      }
    } catch {
      /* kullanıcı iptal etti */
    }
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--radius-card)] border border-purple-100 bg-white shadow-soft',
        compact ? '' : 'shadow-lift',
      )}
    >
      <div className="flex items-center justify-between border-b border-purple-100 bg-purple-50/60 px-5 py-3">
        <p className="text-sm font-semibold text-purple-800">Aroma Bulucu</p>
        <p className="text-xs text-ink-soft">
          {done ? 'Sonuç' : `${step + 1} / ${questions.length}`}
        </p>
      </div>

      <div className="h-1 bg-purple-100">
        <div
          className="h-full bg-gold-400 transition-all duration-500"
          style={{ width: `${(Math.min(step, questions.length) / questions.length) * 100}%` }}
        />
      </div>

      <div className="p-5 sm:p-7">
        <AnimatePresence mode="wait">
          {!done ? (
            <m.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <h3 className="font-display text-xl font-semibold text-purple-900">{questions[step].q}</h3>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {questions[step].choices.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => choose(c)}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all',
                      picks[step]?.label === c.label
                        ? 'border-purple-600 bg-purple-600 text-cream'
                        : 'border-purple-200 text-purple-800 hover:border-purple-400 hover:bg-purple-50',
                    )}
                  >
                    {c.label}
                    {picks[step]?.label === c.label && <Check size={16} />}
                  </button>
                ))}
              </div>
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-purple-700"
                >
                  <ArrowLeft size={13} /> Geri
                </button>
              )}
            </m.div>
          ) : (
            <m.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="font-display text-xl font-semibold text-purple-900">Sana uygun 3 aroma</h3>
              <p className="mt-1 text-sm text-ink-soft">Seçimlerine göre öne çıkan profiller:</p>
              <ul className="mt-4 space-y-2.5">
                {results.map((p, i) => (
                  <m.li
                    key={p.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                  >
                    <Link
                      href={`/urun/${p.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-purple-100 p-2.5 transition-colors hover:bg-purple-50"
                    >
                      <Image
                        src={p.images[0].src}
                        alt=""
                        width={56}
                        height={56}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-purple-900">{p.name}</p>
                        <p className="truncate text-xs text-ink-soft">
                          {p.flavorNotes.slice(0, 3).map((n) => n.label).join(', ')}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-purple-700">{currency(p.basePrice)}</span>
                    </Link>
                  </m.li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={restart} className="btn-ghost text-xs">
                  <RefreshCw size={14} /> Yeniden başla
                </button>
                <button type="button" onClick={share} className="btn-ghost text-xs">
                  <Share2 size={14} /> Sonucu paylaş
                </button>
                <Link href="/urunler" className="btn-primary ml-auto text-xs">
                  Tüm aromalar <ArrowRight size={14} />
                </Link>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
