import type { Metadata } from 'next';
import { requireCustomer } from '@/server/customers/auth';
import { publicCustomer } from '@/server/customers/public';
import { ProfileForm } from '@/components/account/ProfileForm';

export const metadata: Metadata = { title: 'Bilgilerim', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function MyProfilePage() {
  const me = await requireCustomer();
  return (
    <div>
      <h1 className="text-display-sm">Bilgilerim</h1>
      <ProfileForm initial={publicCustomer(me)} />
    </div>
  );
}
