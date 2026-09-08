'use client';

// Panel medya kütüphanesi uçları için istemci sarmalayıcısı.

import { ApiError } from './client';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    throw new ApiError(
      (payload && typeof payload.message === 'string' && payload.message) || `İstek başarısız (${res.status})`,
      res.status,
      payload?.issues ?? {},
    );
  }
  return payload as T;
}

export interface AdminMediaAsset {
  id: string; path: string; fileName: string; mimeType: string; sizeBytes: number;
  width: number | null; height: number | null; alt: string; tags: string[]; createdAt: string;
}
export interface MediaListResult { items: AdminMediaAsset[]; total: number; page: number; pageSize: number; pageCount: number }
export interface MediaListParams { q?: string; tag?: string; page?: number; pageSize?: number }

function qs<T extends object>(p: T): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '' && v !== null) sp.set(k, String(v));
  return sp.toString();
}

export const mediaApi = {
  list: (p: MediaListParams) => request<MediaListResult>(`/api/admin/media?${qs(p)}`, { cache: 'no-store' }),
  upload: (file: File) => {
    const form = new FormData();
    form.set('file', file);
    return request<{ asset: AdminMediaAsset }>('/api/admin/media', { method: 'POST', body: form });
  },
  update: (id: string, body: { alt: string; tags: string[] }) =>
    request<{ asset: AdminMediaAsset }>(`/api/admin/media/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  remove: (id: string) => request<{ ok: true }>(`/api/admin/media/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
