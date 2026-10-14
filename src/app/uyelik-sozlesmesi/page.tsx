import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { getSignupLegal } from '@/server/customers/signup-legal';

export const metadata: Metadata = {
  title: 'Üyelik Sözleşmesi',
  alternates: { canonical: '/uyelik-sozlesmesi' },
};

export const dynamic = 'force-dynamic';

export default async function MembershipAgreementPage() {
  return <LegalDocumentPage doc={(await getSignupLegal()).uyelik} />;
}
