// Giriş/kayıt sayfalarının ortak iskeleti: başlık + form, geniş ekranda üyelik avantajları.

import type { ReactNode } from 'react';
import { BadgePercent, MapPin, PackageSearch, ShieldCheck } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

const BENEFITS = [
  { icon: PackageSearch, title: 'Sipariş takibi', text: 'Siparişlerinizi ve kargo durumunu tek yerden izleyin.' },
  { icon: MapPin, title: 'Hızlı ödeme', text: 'Adresleriniz kayıtlı kalır, siparişiniz saniyeler sürer.' },
  { icon: BadgePercent, title: 'Üyelere özel fırsatlar', text: 'Kampanya ve indirimlerden ilk siz haberdar olun.' },
  { icon: ShieldCheck, title: 'Güvenli hesap', text: 'Verileriniz KVKK kapsamında korunur; dilediğiniz an hesabınızı silebilirsiniz.' },
];

export function AuthShell({
  crumb,
  title,
  subtitle,
  children,
  benefits = true,
}: {
  crumb: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  benefits?: boolean;
}) {
  return (
    <div className="container-page section !pt-8">
      <Breadcrumbs items={[{ label: crumb }]} />
      <div className={benefits ? 'mx-auto mt-6 grid max-w-5xl items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px]' : 'mx-auto mt-6 max-w-md'}>
        <div className={benefits ? 'mx-auto w-full max-w-lg lg:mx-0' : undefined}>
          <h1 className="text-display-sm">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {benefits && (
          <aside className="hidden rounded-lg border border-line bg-mist p-6 lg:mt-[4.5rem] lg:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Üyelik avantajları</p>
            <ul className="mt-4 space-y-5">
              {BENEFITS.map(({ icon: Icon, title: t, text }) => (
                <li key={t} className="flex gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-brand-500 shadow-sm">
                    <Icon size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{t}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
