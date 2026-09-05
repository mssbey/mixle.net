// Katalog kalıcılığı — atomik dosya yazımı (geçici dosya + rename).
// Yalnızca sunucu tarafında (Route Handler) import edilir.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { CATALOG_SCHEMA_VERSION, type CatalogFile } from '@/types/admin';
import { catalogFileSchema } from './schema';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const CATALOG_PATH = path.join(DATA_DIR, 'catalog.json');
const SEED_PATH = path.join(DATA_DIR, 'catalog.seed.json');

export class CatalogValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: Record<string, string>,
  ) {
    super(message);
    this.name = 'CatalogValidationError';
  }
}

export async function readCatalog(): Promise<CatalogFile> {
  const raw = await fs.readFile(CATALOG_PATH, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  const result = catalogFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new CatalogValidationError('catalog.json şeması geçersiz', flatten(result.error));
  }
  return result.data;
}

export async function readSeedCatalog(): Promise<CatalogFile> {
  const raw = await fs.readFile(SEED_PATH, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  const result = catalogFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new CatalogValidationError('catalog.seed.json şeması geçersiz', flatten(result.error));
  }
  return result.data;
}

/**
 * Kataloğu doğrular, `updatedAt`/`schemaVersion` alanlarını tazeler ve atomik yazar.
 * Aynı dizine geçici dosya yazıp `rename` ile taşır; yarım yazma bırakmaz.
 */
export async function writeCatalog(next: CatalogFile): Promise<CatalogFile> {
  const stamped: CatalogFile = {
    ...next,
    schemaVersion: CATALOG_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };

  const result = catalogFileSchema.safeParse(stamped);
  if (!result.success) {
    throw new CatalogValidationError('Katalog doğrulaması başarısız', flatten(result.error));
  }

  const body = JSON.stringify(result.data, null, 2) + '\n';
  const tmpPath = path.join(
    DATA_DIR,
    `.catalog.${process.pid}.${Date.now()}.tmp`,
  );
  await fs.writeFile(tmpPath, body, 'utf8');
  try {
    await fs.rename(tmpPath, CATALOG_PATH);
  } catch (err) {
    await fs.rm(tmpPath, { force: true });
    throw err;
  }
  return result.data;
}

/** catalog.seed.json içeriğini catalog.json üzerine yazar (demoya sıfırlama). */
export async function resetCatalog(): Promise<CatalogFile> {
  const seed = await readSeedCatalog();
  return writeCatalog(seed);
}

function flatten(error: import('zod').ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
