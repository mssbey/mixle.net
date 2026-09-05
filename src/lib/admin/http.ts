// Route Handler ortak yardımcıları.

import { canWrite, readOnlyResponse } from './guard';
import { AdminError } from './mutations';
import { CatalogValidationError } from './store';

export function jsonError(message: string, status = 400, issues?: Record<string, string>): Response {
  return Response.json({ error: 'invalid', message, issues: issues ?? {} }, { status });
}

/** Yazma uçlarını sarar: izin kontrolü + hata dönüşümü. */
export function withWrite(handler: () => Promise<Response>): Promise<Response> {
  if (!canWrite()) return Promise.resolve(readOnlyResponse());
  return handler().catch(toErrorResponse);
}

export function withRead(handler: () => Promise<Response>): Promise<Response> {
  return handler().catch(toErrorResponse);
}

export function toErrorResponse(err: unknown): Response {
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
  const message = err instanceof Error ? err.message : 'Beklenmeyen hata';
  return Response.json({ error: 'server', message }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new AdminError('Geçersiz JSON gövdesi', 400);
  }
}
