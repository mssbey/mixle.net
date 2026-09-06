// Prisma istemcisi — tek örnek (singleton).
// Yalnız sunucu tarafında import edilir; `server-only` bunu derleme anında zorlar.
//
// Prisma 7 bir "driver adapter" ister; bağlantı artık şemadaki `url` üzerinden
// değil, buradan kurulur. Postgres'e geçerken YALNIZCA bu dosya ve
// prisma/schema.prisma içindeki `provider` değişir:
//   npm i @prisma/adapter-pg
//   new PrismaPg({ connectionString: process.env.DATABASE_URL })

import 'server-only';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@/generated/prisma/client';

declare global {
  var __nefisPrisma: PrismaClient | undefined;
}

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL tanımlı değil. .env dosyasına DATABASE_URL="file:./data/nefis.db" ekleyin.',
    );
  }
  return url;
}

function createClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl() });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

// Dev'de sıcak yeniden yükleme her seferinde yeni bir istemci üretip bağlantı
// sızdırmasın diye globalThis üzerinde saklanır.
export const db: PrismaClient = globalThis.__nefisPrisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__nefisPrisma = db;
}
