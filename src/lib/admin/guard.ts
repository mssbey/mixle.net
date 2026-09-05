// Yazma izni kontrolü. Vitrin bir demo olduğu için üretimde katalog dosyasına yazma kapalıdır.

export function canWrite(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.ADMIN_WRITE_ENABLED === 'true';
}

export const READ_ONLY_MESSAGE =
  'Salt okunur mod: bu ortamda katalog dosyasına yazılamıyor. ' +
  'Yazmayı açmak için ADMIN_WRITE_ENABLED=true tanımlayın.';

export function readOnlyResponse(): Response {
  return Response.json(
    { error: 'read-only', message: READ_ONLY_MESSAGE },
    { status: 403 },
  );
}
