'use client';

// Panel > Ayarlar > Kullanıcılar: liste, oluştur, rol/durum/parola düzenle.

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { TableSkeleton, Field } from '@/components/admin/primitives';
import { SmallChip } from '@/components/admin/orders/status';
import { Dialog } from '@/components/admin/orders/Dialog';
import { usersApi, type AdminUserRow } from '@/lib/admin/settings-client';
import { ApiError } from '@/lib/admin/client';
import { ROLES, roleLabels, roleDescriptions } from '@/server/auth/rbac';
import { toast } from '@/store/toast';

const dateTime = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });

function NewUserDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]>('görüntüleyici');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await usersApi.create({ email, name, role, password });
      toast.success('Kullanıcı oluşturuldu', email);
      setEmail(''); setName(''); setPassword(''); setRole('görüntüleyici');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : err instanceof Error ? err.message : 'Oluşturulamadı');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Yeni kullanıcı"
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !email || !password} onClick={() => void create()}>{busy ? 'Oluşturuluyor…' : 'Oluştur'}</button>
      </>}>
      <div className="grid gap-3">
        <Field label="E-posta" htmlFor="nu-email" required><input id="nu-email" type="email" className="admin-input" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Ad soyad (opsiyonel)" htmlFor="nu-name"><input id="nu-name" className="admin-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Rol" htmlFor="nu-role">
          <select id="nu-role" className="admin-select" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            {ROLES.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
          </select>
          <span className="admin-hint mt-1 block">{roleDescriptions[role]}</span>
        </Field>
        <Field label="Parola" htmlFor="nu-pass" required hint="En az 10 karakter, en az bir harf ve bir rakam."><input id="nu-pass" type="password" autoComplete="new-password" className="admin-input" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      </div>
      {error && <p className="admin-error mt-2" role="alert">{error}</p>}
    </Dialog>
  );
}

function EditUserDialog({ row, currentUserId, onClose, onSaved }: { row: AdminUserRow; currentUserId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(row.name);
  const [role, setRole] = useState(row.role as (typeof ROLES)[number]);
  const [isActive, setIsActive] = useState(row.isActive);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSelf = row.id === currentUserId;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await usersApi.update(row.id, { name, role, isActive, password: password || undefined });
      toast.success('Kullanıcı güncellendi', row.email);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : err instanceof Error ? err.message : 'Güncellenemedi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={row.email} description={`Kayıt: ${dateTime.format(new Date(row.createdAt))}${row.lastLoginAt ? ` · Son giriş: ${dateTime.format(new Date(row.lastLoginAt))}` : ' · Hiç giriş yapmadı'}`}
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </>}>
      <div className="grid gap-3">
        <Field label="Ad soyad" htmlFor="eu-name"><input id="eu-name" className="admin-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Rol" htmlFor="eu-role" hint={isSelf ? 'Kendi rolünüzü düşüremezsiniz.' : roleDescriptions[role]}>
          <select id="eu-role" className="admin-select" disabled={isSelf} value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            {ROLES.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={isSelf} checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Aktif
          {isSelf && <span className="admin-hint">(kendi hesabınızı pasife alamazsınız)</span>}
        </label>
        <Field label="Yeni parola (opsiyonel)" htmlFor="eu-pass" hint="Boş bırakılırsa değişmez. Değiştirilirse açık oturumlar kapanır.">
          <input id="eu-pass" type="password" autoComplete="new-password" className="admin-input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      </div>
      {error && <p className="admin-error mt-2" role="alert">{error}</p>}
    </Dialog>
  );
}

export function UsersPanel() {
  const { status, user } = useAdminData();
  const [items, setItems] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);

  const load = () => {
    usersApi.list().then((r) => setItems(r.items)).catch((err) => setError(err instanceof Error ? err.message : 'Yüklenemedi'));
  };

  useEffect(() => {
    if (status === 'ready') load();
  }, [status]);

  if (status === 'loading' || (!items && !error)) return <TableSkeleton rows={4} />;
  if (error) return <p className="admin-error">{error}</p>;

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Kullanıcılar</h1>
          <p className="admin-hint mt-0.5">Panel hesapları ve roller</p>
        </div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}><Plus size={14} /> Yeni kullanıcı</button>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>E-posta</th><th>Ad</th><th>Rol</th><th>Durum</th><th>Son giriş</th></tr></thead>
          <tbody>
            {(items ?? []).map((u) => (
              <tr key={u.id}>
                <td><button type="button" className="font-semibold text-[var(--brand-purple)]" onClick={() => setEditing(u)}>{u.email}</button>{u.id === user?.id && <span className="ml-1 text-xs text-[var(--admin-ink-soft)]">(siz)</span>}</td>
                <td>{u.name || '—'}</td>
                <td>{roleLabels[u.role as keyof typeof roleLabels] ?? u.role}</td>
                <td><SmallChip tone={u.isActive ? 'ok' : 'neutral'}>{u.isActive ? 'Aktif' : 'Pasif'}</SmallChip></td>
                <td className="text-xs text-[var(--admin-ink-soft)]">{u.lastLoginAt ? dateTime.format(new Date(u.lastLoginAt)) : 'Hiç girmedi'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewUserDialog open={creating} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />
      {editing && user && <EditUserDialog row={editing} currentUserId={user.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}
