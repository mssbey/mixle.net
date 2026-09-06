// Route Handler ortak yardımcıları.
//
// Her admin ucu `handle()` ile sarılır: izin kontrolü + hata dönüşümü tek
// yerden yapılır. İzin kontrolü BURADA (işlem bazlı) asıl kontroldür;
// `src/proxy.ts` yalnızca rota bazlı kaba filtredir.

import { ZodError } from 'zod';
import { AuthError, requirePermission, type AdminUser } from '@/server/auth/current-user';
import type { Permission } from '@/server/auth/rbac';
import { AdminError } from './mutations';
import { fieldErrors } from './schema';

export class CatalogValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: Record<string, string>,
  ) {
    super(message);
    this.name = 'CatalogValidationError';
  }
}

export function jsonError(
  message: string,
  status = 400,
  issues?: Record<string, string>,
): Response {
  return Response.json({ error: 'invalid', message, issues: issues ?? {} }, { status });
}

/**
 * Bir admin ucunu yetki kontrolü ve hata dönüşümüyle sarar.
 *
 * @param permission Bu ucun gerektirdiği izin (bkz. `src/server/auth/rbac.ts`).
 */
export async function handle(
  permission: Permission,
  handler: (user: AdminUser) => Promise<Response>,
): Promise<Response> {
  try {
    const user = await requirePermission(permission);
    return await handler(user);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export function toErrorResponse(err: unknown): Response {
  if (err instanceof AuthError) {
    return Response.json(
      { error: err.status === 401 ? 'unauthorized' : 'forbidden', message: err.message },
      { status: err.status },
    );
  }
  if (err instanceof AdminError) {
    return Response.json(
      { error: 'invalid', message: err.message, issues: err.issues },
      { status: err.status },
    );
  }
  if (err instanceof CatalogValidationError) {
    return Response.json(
      { error: 'schema', message: err.message, issues: err.issues },
      { status: 422 },
    );
  }
  if (err instanceof ZodError) {
    return Response.json(
      { error: 'invalid', message: 'Doğrulama başarısız', issues: fieldErrors(err) },
      { status: 422 },
    );
  }
  const message = err instanceof Error ? err.message : 'Beklenmeyen hata';
  console.error('[admin api]', err);
  return Response.json({ error: 'server', message }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new AdminError('Geçersiz JSON gövdesi', 400);
  }
}
