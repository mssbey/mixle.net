import type { Metadata } from 'next';
import { requireCustomer } from '@/server/customers/auth';
import { listAddresses } from '@/server/customers/addresses';
import { AddressBook } from '@/components/account/AddressBook';

export const metadata: Metadata = { title: 'Adreslerim', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function MyAddressesPage() {
  const me = await requireCustomer();
  const addresses = await listAddresses(me.id);
  return (
    <div>
      <h1 className="text-display-sm">Adreslerim</h1>
      <AddressBook initial={addresses} />
    </div>
  );
}
