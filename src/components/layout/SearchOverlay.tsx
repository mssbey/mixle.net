'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, X, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { useUI } from '@/store/ui';
import { useSearchHistory } from '@/store/favorites';
import { useMounted, useScrollLock, useDialog, useDebounced } from '@/lib/hooks';
import { searchProducts, popularSearches } from '@/lib/search';
import { useCategories, useSlimProducts } from '@/components/catalog/CatalogProvider';
import { currency } from '@/lib/site';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'framer-motion';

export function SearchOverlay() {
  const mounted = useMounted();
  const { searchOpen, setSearch } = useUI();
  const { terms, add, clear } = useSearchHistory();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounced = useDebounced(query, 160);

  useScrollLock(searchOpen);
  const dialogRef = useDialog(searchOpen, () => setSearch(false));

  const categories = useCategories();
  // Katalog yalnızca arama katmanı açıldığında indirilir.
  const { products } = useSlimProducts(searchOpen);
  const results = useMemo(
    () => (debounced.trim().length >= 2 ? searchProducts(debounced, products, categories, 6) : []),
    [debounced, products, categories],
  );
  const catHits = useMemo(
    () =>
      debounced.trim().length >= 2
        ? categories.filter((c) => c.name.toLocaleLowerCase('tr').includes(debounced.toLocaleLowerCase('tr'))).slice(0, 3)
        : [],
    [debounced, categories],
  );

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setActiveIdx(-1);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [searchOpen]);

  const go = (term: string) => {
    if (term.trim().length < 2) return;
    add(term.trim());
    setSearch(false);
    router.push(`/arama?q=${encodeURIComponent(term.trim())}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && results[activeIdx]) {
        add(query.trim());
        setSearch(false);
        router.push(`/urun/${results[activeIdx].product.slug}`);
      } else {
        go(query);
      }
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {searchOpen && (
        <m.div
          className="fixed inset-0 z-[120] flex justify-center overflow-y-auto px-4 pt-[6vh] pb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="fixed inset-0 bg-purple-900/60 backdrop-blur-sm" onClick={() => setSearch(false)} aria-hidden />
          <m.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Ürün ara"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 h-fit w-full max-w-2xl overflow-hidden rounded-2xl border border-purple-100 bg-cream shadow-lift"
          >
            <div className="flex items-center gap-3 border-b border-purple-100 px-4">
              <Search size={20} className="shrink-0 text-purple-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIdx(-1);
                }}
                onKeyDown={onKeyDown}
                placeholder="Aroma adı, kategori veya tat notu ara…"
                aria-label="Arama terimi"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-soft/60"
              />
              <button
                type="button"
                onClick={() => setSearch(false)}
                aria-label="Aramayı kapat"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-purple-400 hover:bg-purple-50 hover:text-purple-700"
              >
                <X size={17} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {debounced.trim().length < 2 ? (
                <div className="space-y-6">
                  {terms.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                          <Clock size={13} /> Son aramalar
                        </span>
                        <button
                          type="button"
                          onClick={clear}
                          className="text-xs text-purple-500 hover:text-purple-700"
                        >
                          Temizle
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {terms.map((t) => (
                          <button key={t} type="button" onClick={() => go(t)} className="chip hover:border-purple-400">
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      <TrendingUp size={13} /> Popüler aramalar
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {popularSearches.map((t) => (
                        <button key={t} type="button" onClick={() => go(t)} className="chip hover:border-purple-400">
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : results.length === 0 && catHits.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-display text-lg font-semibold text-purple-800">Sonuç bulunamadı</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    “{debounced}” için eşleşme yok. Farklı bir aroma adı veya tat notu deneyin.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {catHits.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {catHits.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/kategori/${c.slug}`}
                          onClick={() => setSearch(false)}
                          className="chip bg-purple-50 hover:border-purple-400"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  )}
                  <ul className="space-y-1">
                    {results.map((hit, i) => (
                      <li key={hit.product.id}>
                        <Link
                          href={`/urun/${hit.product.slug}`}
                          onClick={() => {
                            add(query.trim());
                            setSearch(false);
                          }}
                          className={`flex items-center gap-3 rounded-xl p-2 transition-colors ${
                            i === activeIdx ? 'bg-purple-50' : 'hover:bg-purple-50'
                          }`}
                        >
                          <Image
                            src={hit.product.images[0].src}
                            alt=""
                            width={52}
                            height={52}
                            className="h-13 w-13 shrink-0 rounded-lg object-cover"
                            style={{ height: 52, width: 52 }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-purple-900">{hit.product.name}</p>
                            <p className="truncate text-xs text-ink-soft">
                              {categories.find((c) => c.slug === hit.product.category)?.name} ·{' '}
                              {hit.product.flavorNotes.slice(0, 2).map((n) => n.label).join(', ')}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-purple-700">
                            {currency(hit.product.basePrice)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => go(query)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-purple-200 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                  >
                    “{debounced}” için tüm sonuçlar <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
