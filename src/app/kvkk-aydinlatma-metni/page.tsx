import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { getSignupLegal } from '@/server/customers/signup-legal';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni',
  alternates: { canonical: '/kvkk-aydinlatma-metni' },
};

export const dynamic = 'force-dynamic';

export default async function KvkkNoticePage() {
  return <LegalDocumentPage doc={(await getSignupLegal()).kvkk} />;
}
