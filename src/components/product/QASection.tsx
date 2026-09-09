'use client';

import { useState } from 'react';
import { HelpCircle, MessageSquare } from 'lucide-react';
import type { QuestionAnswer } from '@/types';
import { formatDateTR } from '@/lib/utils';
import { toast } from '@/store/toast';

export function QASection({ productId, initial }: { productId: string; initial: QuestionAnswer[] }) {
  const [items, setItems] = useState(initial.filter((item) => !item.demo));
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || question.trim().length < 6) {
      toast.error('Eksik bilgi', 'Adınızı ve sorunuzu yazın.');
      return;
    }
    const demo: QuestionAnswer = {
      id: `${productId}-qa-local-${Date.now()}`,
      productId,
      author: name.trim(),
      date: new Date().toISOString(),
      question: question.trim(),
      demo: true,
    };
    setItems((q) => [demo, ...q]);
    setName('');
    setQuestion('');
    toast.success('Sorunuz alındı', 'Bu demo bir arayüzdür; gerçek bir sunucuya iletilmez.');
  };

  return (
    <section className="mt-16 border-t border-line pt-10">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink sm:text-xl">
        <HelpCircle size={22} className="text-brand-500" /> Soru & Cevap (demo)
      </h2>

      <p className="mt-2 text-sm text-ink-soft">Bu formu deneyebilirsiniz; sorular sunucuya gönderilmez.</p>
      <form onSubmit={submit} className="mt-6 grid max-w-xl gap-3 rounded-lg border border-line bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Adınız"
            aria-label="Adınız"
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          placeholder="Ürünle ilgili sorunuzu yazın…"
          aria-label="Sorunuz"
          className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
        <button type="submit" className="btn-primary w-fit">
          Soruyu Gönder
        </button>
      </form>

      <ul className="mt-6 space-y-4">
        {items.map((q) => (
          <li key={q.id} className="rounded-lg border border-line p-5">
            <p className="flex items-start gap-2 text-sm font-semibold text-ink">
              <MessageSquare size={15} className="mt-0.5 shrink-0 text-ink-soft" /> {q.question}
            </p>
            <p className="mt-1 pl-6 text-xs text-ink-soft">
              {q.author} · {formatDateTR(q.date)}
            </p>
            {q.answer ? (
              <p className="mt-2 rounded-md bg-mist p-3 pl-6 text-sm text-ink">
                <span className="font-semibold text-brand-500">Nefis Aroma: </span>
                {q.answer}
              </p>
            ) : (
              <p className="mt-2 pl-6 text-xs italic text-ink-soft">Henüz yanıtlanmadı.</p>
            )}
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="mt-6 text-sm text-ink-soft">Henüz soru yok. İlk soruyu siz sorun.</p>}
    </section>
  );
}
