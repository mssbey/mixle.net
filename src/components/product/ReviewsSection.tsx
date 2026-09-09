'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { Review } from '@/types';
import { Rating } from '@/components/ui/Rating';
import { StarInput } from '@/components/ui/StarInput';
import { formatDateTR } from '@/lib/utils';
import { toast } from '@/store/toast';

export function ReviewsSection({ productId, initial }: { productId: string; initial: Review[] }) {
  const [reviews, setReviews] = useState(initial.filter((review) => !review.demo));
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || body.trim().length < 8) {
      toast.error('Eksik bilgi', 'Adınızı ve en az birkaç kelimelik bir değerlendirme yazın.');
      return;
    }
    const demo: Review = {
      id: `${productId}-local-${Date.now()}`,
      productId,
      author: name.trim(),
      rating,
      date: new Date().toISOString(),
      title: 'Yeni değerlendirme',
      body: body.trim(),
      verified: false,
      demo: true,
    };
    setReviews((r) => [demo, ...r]);
    setName('');
    setBody('');
    setRating(5);
    setOpen(false);
    toast.success('Değerlendirmeniz eklendi', 'Bu demo bir arayüzdür; veriniz sunucuya gönderilmez.');
  };

  return (
    <section className="mt-16 border-t border-line pt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink sm:text-xl">Değerlendirmeler</h2>
          <div className="mt-1.5 flex items-center gap-2">
            <Rating value={avg} count={reviews.length} />
          </div>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn-ghost">
          Değerlendirme yaz
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-6 max-w-xl space-y-3 rounded-lg border border-line bg-white p-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink">Puanınız</label>
            <StarInput value={rating} onChange={setRating} size={24} />
          </div>
          <div>
            <label htmlFor="rev-name" className="mb-1.5 block text-xs font-semibold text-ink">
              Adınız
            </label>
            <input
              id="rev-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
              placeholder="Ör. Ayşe K."
            />
          </div>
          <div>
            <label htmlFor="rev-body" className="mb-1.5 block text-xs font-semibold text-ink">
              Yorumunuz
            </label>
            <textarea
              id="rev-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
              placeholder="Deneyiminizi paylaşın…"
            />
          </div>
          <p className="text-xs text-ink-soft">
            Bu form yalnızca frontend demosudur; gönderilen veriler bir sunucuya iletilmez.
          </p>
          <button type="submit" className="btn-primary">
            Gönder
          </button>
        </form>
      )}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-lg border border-line p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  {r.author}
                  {r.verified && !r.demo && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-success">
                      <ShieldCheck size={12} /> Doğrulanmış
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink-soft">{formatDateTR(r.date)}</p>
              </div>
              <Rating value={r.rating} showValue={false} size={13} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink">{r.body}</p>
          </li>
        ))}
      </ul>
      {reviews.length === 0 && (
        <p className="mt-6 text-sm text-ink-soft">Henüz değerlendirme yok. İlk yorumu siz yazın.</p>
      )}
    </section>
  );
}
