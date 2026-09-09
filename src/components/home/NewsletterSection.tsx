import { Mail } from 'lucide-react';
import { NewsletterForm } from '@/components/layout/NewsletterForm';
import { Reveal } from '@/components/ui/Reveal';

export function NewsletterSection() {
  return (
    <section className="section container-page">
      <Reveal>
        <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-purple-100 bg-white p-8 shadow-soft sm:p-12">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold-100/70 blur-3xl" aria-hidden />
          <div className="relative grid grid-cols-1 items-center gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-500">
                <Mail size={20} strokeWidth={1.6} />
              </span>
              <h2 className="mt-4 text-2xl font-bold text-ink sm:text-3xl">
                Kampanya ve yeni ürünlerden ilk sen haberdar ol.
              </h2>
              <p className="mt-2 max-w-md text-sm text-ink-soft">
                E-posta adresini bırak; indirim, yeni gelen ürün ve duyuruları sana iletelim. Dilediğin
                zaman çıkabilirsin.
              </p>
            </div>
            <NewsletterForm variant="light" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
