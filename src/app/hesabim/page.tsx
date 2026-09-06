import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Hesabım', robots: { index: false, follow: true } };

// Hesap ana sayfası doğrudan siparişlere açılır.
export default function AccountHome() {
  redirect('/hesabim/siparisler');
}
