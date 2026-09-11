// Admin kullanıcısı oluşturur / günceller.
//
// Kullanım:
//   npm run admin:create-user                         (etkileşimli)
//   npm run admin:create-user -- --email=a@b.com --role=sahip --password=...
//   npm run admin:create-user -- --list
//
// İlk kurulumda en az bir `sahip` kullanıcısı oluşturulmalıdır; aksi halde
// panele girilemez.

import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword, passwordProblem } from '../src/server/auth/password';
import { ROLES, isRole, roleDescriptions, type Role } from '../src/server/auth/rbac';

function arg(name: string): string | undefined {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

const wantsList = process.argv.includes('--list');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL tanımlı değil (.env dosyasına ekleyin).');

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    if (wantsList) {
      const users = await db.user.findMany({ orderBy: { createdAt: 'asc' } });
      if (users.length === 0) {
        console.log('Henüz kullanıcı yok.');
      } else {
        console.log(`${users.length} kullanıcı:\n`);
        for (const u of users) {
          const state = u.isActive ? 'aktif' : 'PASİF';
          const last = u.lastLoginAt ? u.lastLoginAt.toISOString() : 'hiç girmedi';
          console.log(`  ${u.email.padEnd(32)} ${u.role.padEnd(18)} ${state.padEnd(6)} son giriş: ${last}`);
        }
      }
      return;
    }

    const rl = createInterface({ input: stdin, output: stdout });

    try {
      const email = (arg('email') ?? (await rl.question('E-posta: '))).trim().toLocaleLowerCase('tr');
      if (!email.includes('@')) throw new Error('Geçerli bir e-posta girin.');

      let role = arg('role');
      if (!role) {
        console.log('\nRoller:');
        for (const r of ROLES) console.log(`  ${r.padEnd(20)} ${roleDescriptions[r]}`);
        role = (await rl.question(`\nRol [${ROLES[0]}]: `)).trim() || ROLES[0];
      }
      if (!isRole(role)) {
        throw new Error(`Geçersiz rol: ${role}. Geçerli roller: ${ROLES.join(', ')}`);
      }

      const name = arg('name') ?? (await rl.question('Ad soyad (isteğe bağlı): ')).trim();

      const password = arg('password') ?? (await rl.question('Parola: '));
      const problem = passwordProblem(password);
      if (problem) throw new Error(problem);

      const passwordHash = await hashPassword(password);
      const existing = await db.user.findUnique({ where: { email } });

      if (existing) {
        await db.user.update({
          where: { email },
          data: { passwordHash, role: role as Role, name: name || existing.name, isActive: true },
        });
        // Parola değiştiğinde eski oturumlar geçersiz kılınır.
        const { count } = await db.session.updateMany({
          where: { userId: existing.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        console.log(`\nGüncellendi: ${email} (${role})`);
        if (count > 0) console.log(`${count} açık oturum kapatıldı.`);
      } else {
        await db.user.create({
          data: { email, passwordHash, role: role as Role, name: name || email.split('@')[0] },
        });
        console.log(`\nOluşturuldu: ${email} (${role})`);
      }

      console.log('Panele giriş: /admin/giris');
    } finally {
      rl.close();
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(`\nHata: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
