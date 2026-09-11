'use client';

import { useState } from 'react';
import { z } from 'zod';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { toast } from '@/store/toast';
import { cn } from '@/lib/utils';

const emailSchema = z.string().email('Geçerli bir e-posta adresi girin.');
const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s()-]/g, ''))
  .refine((v) => /^(\+90|0)?5\d{9}$/.test(v), 'Geçerli bir cep telefonu girin (5xx xxx xx xx).');

/**
 * Footer / ana sayfa bülten ve SMS kayıt formu. Gerçek `/api/abonelik` ucuna
 * gönderir; kayıtlar panelde "Bülten / SMS Kayıtları" ekranından görülür.
 */
export function NewsletterForm({
  variant = 'dark',
  kind = 'eposta',
  className,
  submitLabel,
}: {
  variant?: 'dark' | 'light';
  kind?: 'eposta' | 'sms';
  className?: string;
  submitLabel?: string;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const dark = variant === 'dark';
  const isSms = kind === 'sms';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'loading') return;
    const parsed = (isSms ? phoneSchema : emailSchema).safeParse(value.trim());
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    setState('loading');
    try {
      const res = await fetch('/api/abonelik', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isSms ? { kind: 'sms', phone: parsed.data } : { kind: 'eposta', email: parsed.data },
        ),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) {
        setState('idle');
        setError(data.message ?? 'Kayıt tamamlanamadı. Lütfen tekrar deneyin.');
        return;
      }
      setState('done');
      toast.success('Kaydınız alındı', data.message);
      setValue('');
      setTimeout(() => setState('idle'), 3500);
    } catch {
      setState('idle');
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    }
  };

  return (
    <form onSubmit={submit} className={cn('w-full', className)} noValidate>
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border p-1 pl-3 transition-colors',
          dark
            ? 'border-white/20 bg-white/5 focus-within:border-brand-300'
            : 'border-line bg-white focus-within:border-brand-400',
        )}
      >
        {isSms && (
          <span className={cn('shrink-0 text-sm font-medium', dark ? 'text-white/70' : 'text-ink-soft')}>
            +90
          </span>
        )}
        <input
          type={isSms ? 'tel' : 'email'}
          inputMode={isSms ? 'tel' : 'email'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isSms ? '5xx xxx xx xx' : 'E-posta adresiniz'}
          aria-label={isSms ? 'Cep telefonu numaranız' : 'E-posta adresiniz'}
          aria-invalid={!!error}
          className={cn(
            'min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-current/50',
            dark ? 'text-white' : 'text-ink',
          )}
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded transition-colors disabled:opacity-70',
            state === 'done' ? 'bg-success text-white' : 'bg-brand-500 text-white hover:bg-brand-600',
          )}
          aria-label={isSms ? 'SMS bilgilendirmeye kaydol' : 'Bültene kaydol'}
        >
          {state === 'loading' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : state === 'done' ? (
            <Check size={16} />
          ) : (
            submitLabel || <ArrowRight size={16} />
          )}
        </button>
      </div>
      {error && (
        <p className={cn('mt-2 pl-1 text-xs', dark ? 'text-brand-200' : 'text-brand-600')}>{error}</p>
      )}
    </form>
  );
}
