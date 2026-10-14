// Eski panelden (admin.mixle.net) dışa aktarılan müşterileri Mixle mağazasına
// üye olarak yükler ve hepsine aynı başlangıç parolasını verir.
//
// Kullanım:
//   npx tsx scripts/import-legacy-customers.ts --file=<musteriler.tsv> --password=<parola>
//   (önce kuru çalıştırma: --dry-run)
//
// TSV sütunları: id, ad, eposta, telefon, siparis, etiket, kayit (gg.aa.yyyy)
// - Test hesapları (example.com, blackhole, misafir.local) atlanır.
// - Sitede zaten kendi parolası olan hesabın parolasına DOKUNULMAZ.
// - Misafir kaydı varsa üyeliğe dönüştürülür (sipariş geçmişi korunur).

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/server/auth/password';

const STORE = 'mixle';
const SKIP_EMAIL = /@example\.com$|@blackhole\.postmarkapp\.com$|@misafir\.local$/;

function arg(name: string): string | undefined {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter((p) => p && p !== '-');
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

function parseDate(s: string): Date | undefined {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s.trim());
  return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 9)) : undefined;
}

async function main() {
  const file = arg('file');
  const password = arg('password');
  const dryRun = process.argv.includes('--dry-run');
  if (!file || !password) throw new Error('--file=... ve --password=... gerekli.');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL tanımlı değil.');

  const rows = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [legacyId, name, email, phone, , , registered] = line.split('\t');
      return {
        legacyId,
        name,
        email: email.trim().toLocaleLowerCase('tr'),
        phone: phone && phone !== '—' && !phone.includes('@') ? phone.trim() : null,
        createdAt: parseDate(registered),
      };
    });

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const host = new URL(url).host;
  const stats = { created: 0, upgraded: 0, passwordSet: 0, keptOwnPassword: 0, skippedTest: 0, duplicate: 0 };
  const seen = new Set<string>();

  try {
    console.log(`Veritabanı: ${host}${dryRun ? '  (KURU ÇALIŞTIRMA)' : ''}`);
    for (const r of rows) {
      if (SKIP_EMAIL.test(r.email)) {
        stats.skippedTest++;
        continue;
      }
      if (seen.has(r.email)) {
        stats.duplicate++;
        continue;
      }
      seen.add(r.email);

      const existing = await db.customer.findUnique({ where: { store_email: { store: STORE, email: r.email } } });
      if (existing?.passwordHash) {
        stats.keptOwnPassword++;
        continue;
      }
      const passwordHash = dryRun ? '' : await hashPassword(password);
      const note = `Eski panelden aktarıldı (${r.legacyId})`;

      if (existing) {
        if (!dryRun) {
          await db.customer.update({
            where: { id: existing.id },
            data: {
              isGuest: false,
              passwordHash,
              phone: existing.phone ?? r.phone,
              ...(existing.firstName ? {} : splitName(r.name)),
              note: existing.note ? `${existing.note}\n${note}` : note,
            },
          });
        }
        stats.upgraded++;
      } else {
        if (!dryRun) {
          await db.customer.create({
            data: {
              store: STORE,
              email: r.email,
              phone: r.phone,
              ...splitName(r.name),
              passwordHash,
              isGuest: false,
              tags: [],
              note,
              ...(r.createdAt ? { createdAt: r.createdAt } : {}),
            },
          });
        }
        stats.created++;
      }
      stats.passwordSet++;
    }
    console.log(stats);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(`\nHata: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
