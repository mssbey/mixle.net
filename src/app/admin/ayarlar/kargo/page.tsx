import { ZoneManager } from '@/components/admin/shipping/ZoneManager';
import { CarrierSettingsForm } from '@/components/admin/shipping/CarrierSettingsForm';

export default function AdminShippingSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Kargo ayarları</h1>
        <p className="admin-hint mt-0.5">Bölgeler, tarifeler, taşıyıcı bağlantıları ve kapıda ödeme kısıtları</p>
      </header>
      <ZoneManager />
      <CarrierSettingsForm />
    </div>
  );
}
