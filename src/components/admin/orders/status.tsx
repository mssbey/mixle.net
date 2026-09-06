'use client';

import type { OrderStatus } from '@/server/orders/state-machine';
import { orderStatusLabels } from '@/server/orders/state-machine';
import { cn } from '@/lib/utils';

const TONE: Record<string, string> = {
  'ödeme-bekliyor': 'bg-[#fff4de] text-[#8a5a00] border-[#f2d597]',
  başarısız: 'bg-[#fdecec] text-[#b42318] border-[#f4b9b2]',
  ödendi: 'bg-[#e6f6ee] text-[#0f6b3d] border-[#a9dfc2]',
  hazırlanıyor: 'bg-[#efe6f3] text-[#672779] border-[#d9c4e3]',
  kargolandı: 'bg-[#e4f1fb] text-[#0b5394] border-[#b6d5f0]',
  'teslim-edildi': 'bg-[#e6f6ee] text-[#0f6b3d] border-[#a9dfc2]',
  tamamlandı: 'bg-[#e6f6ee] text-[#0f6b3d] border-[#a9dfc2]',
  iptal: 'bg-[#f1f1f1] text-[#555] border-[#ddd]',
  'iade-talebi': 'bg-[#fff4de] text-[#8a5a00] border-[#f2d597]',
  'iade-edildi': 'bg-[#f1f1f1] text-[#555] border-[#ddd]',
  taslak: 'bg-[#f1f1f1] text-[#555] border-[#ddd]',
};

export function OrderStatusChip({ status }: { status: OrderStatus | string }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold', TONE[status] ?? TONE.taslak)}>
      {orderStatusLabels[status as OrderStatus] ?? status}
    </span>
  );
}

export const paymentStatusLabels: Record<string, string> = {
  bekliyor: 'Ödeme bekliyor',
  kısmi: 'Kısmi ödendi',
  ödendi: 'Ödendi',
  başarısız: 'Başarısız',
  'iade-edildi': 'İade edildi',
  'kısmi-iade': 'Kısmi iade',
};

export const fulfillmentLabels: Record<string, string> = {
  hazırlanmadı: 'Sevk edilmedi',
  kısmi: 'Kısmi sevk',
  gönderildi: 'Sevk edildi',
  'teslim-edildi': 'Teslim edildi',
};

export function SmallChip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'bad' }) {
  const t = {
    neutral: 'bg-[#f1f1f1] text-[#555] border-[#ddd]',
    ok: 'bg-[#e6f6ee] text-[#0f6b3d] border-[#a9dfc2]',
    warn: 'bg-[#fff4de] text-[#8a5a00] border-[#f2d597]',
    bad: 'bg-[#fdecec] text-[#b42318] border-[#f4b9b2]',
  }[tone];
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold', t)}>{children}</span>;
}

export const dateTime = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
});
export const dateOnly = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Istanbul' });
