// Ödeme işlemleri listesi (panel): filtre, mutabakat özeti, iade kuyruğu.

import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';
import { handle } from '@/lib/admin/http';
import { db } from '@/server/db';
import { maskSensitive } from '@/server/log';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  view: z.enum(['tumu', 'basarisiz', 'mutabakat', 'iadeler', 'webhooks']).default('tumu'),
  provider: z.string().max(20).optional(),
  status: z.string().max(20).optional(),
  q: z.string().trim().max(120).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(25),
});

export function GET(request: Request): Promise<Response> {
  return handle('siparis:oku', async () => {
    const q = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const skip = (q.page - 1) * q.pageSize;

    if (q.view === 'iadeler') {
      const where: Prisma.RefundWhereInput = q.status ? { status: q.status } : {};
      const [total, rows] = await Promise.all([
        db.refund.count({ where }),
        db.refund.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: q.pageSize, include: { order: { select: { id: true, orderNumber: true } }, user: { select: { email: true, name: true } } } }),
      ]);
      return Response.json({
        view: q.view, total, page: q.page, pageSize: q.pageSize, pageCount: Math.max(1, Math.ceil(total / q.pageSize)),
        items: rows.map((r) => ({ id: r.id, orderId: r.order.id, orderNumber: r.order.orderNumber, amountMinor: r.amountMinor, type: r.type, status: r.status, reason: r.reason, providerRefundId: r.providerRefundId, by: r.user?.name || r.user?.email || 'panel', createdAt: r.createdAt.toISOString(), completedAt: r.completedAt?.toISOString() ?? null })),
      });
    }

    if (q.view === 'webhooks') {
      const where: Prisma.WebhookEventWhereInput = q.provider ? { provider: q.provider } : {};
      const [total, rows] = await Promise.all([
        db.webhookEvent.count({ where }),
        db.webhookEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: q.pageSize }),
      ]);
      return Response.json({
        view: q.view, total, page: q.page, pageSize: q.pageSize, pageCount: Math.max(1, Math.ceil(total / q.pageSize)),
        items: rows.map((w) => ({ id: w.id, provider: w.provider, externalId: w.externalId, processedAt: w.processedAt?.toISOString() ?? null, error: w.error, createdAt: w.createdAt.toISOString(), payload: maskSensitive(w.payload) })),
      });
    }

    if (q.view === 'mutabakat') {
      // Ödendi görünen ama başarılı ödeme kaydı toplamı tutmayan siparişler + başarılı ödeme olup ödenmemiş görünenler.
      const orders = await db.order.findMany({
        where: { status: { notIn: ['taslak'] }, ...(q.from || q.to ? { placedAt: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(q.to) } : {}) } } : {}) },
        include: { payments: true },
        orderBy: { placedAt: 'desc' },
        take: 2000,
      });
      const mismatches = orders
        .map((o) => {
          const paid = o.payments.filter((p) => p.status === 'başarılı').reduce((s, p) => s + p.amountMinor, 0);
          const expected = o.paymentStatus === 'ödendi' || o.paymentStatus === 'kısmi-iade' || o.paymentStatus === 'iade-edildi' ? o.grandTotalMinor : 0;
          const diff = paid - expected;
          return { id: o.id, orderNumber: o.orderNumber, placedAt: o.placedAt.toISOString(), status: o.status, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, grandTotalMinor: o.grandTotalMinor, paidMinor: paid, refundedTotalMinor: o.refundedTotalMinor, diffMinor: diff };
        })
        .filter((m) => m.diffMinor !== 0 && !(m.paymentMethod === 'kapida' && m.paymentStatus === 'bekliyor'));
      const total = mismatches.length;
      return Response.json({ view: q.view, total, page: q.page, pageSize: q.pageSize, pageCount: Math.max(1, Math.ceil(total / q.pageSize)), items: mismatches.slice(skip, skip + q.pageSize) });
    }

    const where: Prisma.PaymentWhereInput = {};
    if (q.view === 'basarisiz') where.status = 'başarısız';
    else if (q.status) where.status = q.status;
    if (q.provider) where.provider = q.provider;
    if (q.from || q.to) where.createdAt = { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(q.to) } : {}) };
    if (q.q) where.OR = [{ providerPaymentId: { contains: q.q } }, { order: { orderNumber: { contains: q.q.toUpperCase() } } }, { cardLast4: { contains: q.q } }];

    const [total, rows, sums] = await Promise.all([
      db.payment.count({ where }),
      db.payment.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: q.pageSize, include: { order: { select: { id: true, orderNumber: true, status: true, paymentStatus: true } } } }),
      db.payment.groupBy({ by: ['status'], where, _sum: { amountMinor: true }, _count: { _all: true } }),
    ]);
    return Response.json({
      view: q.view, total, page: q.page, pageSize: q.pageSize, pageCount: Math.max(1, Math.ceil(total / q.pageSize)),
      summary: sums.map((s) => ({ status: s.status, count: s._count._all, amountMinor: s._sum.amountMinor ?? 0 })),
      items: rows.map((p) => ({ id: p.id, orderId: p.order.id, orderNumber: p.order.orderNumber, orderStatus: p.order.status, provider: p.provider, providerPaymentId: p.providerPaymentId, status: p.status, amountMinor: p.amountMinor, installment: p.installment, cardBrand: p.cardBrand, cardLast4: p.cardLast4, threeDS: p.threeDS, errorMessage: p.errorMessage, createdAt: p.createdAt.toISOString(), capturedAt: p.capturedAt?.toISOString() ?? null })),
    });
  });
}
