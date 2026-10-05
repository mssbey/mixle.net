'use client';

import { useState } from 'react';
import { Store } from 'lucide-react';
import { adminApi } from '@/lib/admin/client';
import { STORE_META, STORES, isStoreId, type StoreId } from '@/lib/stores';
import { toast } from '@/store/toast';

/**
 * Panelde yönetilen mağazayı seçer. Değişince sayfa baştan yüklenir: katalog,
 * listeler ve açık formlar önceki mağazanın verisini taşımasın.
 */
export function StoreSwitcher({ store }: { store: StoreId }) {
  const [pending, setPending] = useState(false);

  const onChange = async (value: string) => {
    if (!isStoreId(value) || value === store) return;
    setPending(true);
    try {
      await adminApi.setStore(value);
      window.location.reload();
    } catch {
      setPending(false);
      toast.error('Mağaza değiştirilemedi');
    }
  };

  return (
    <label className="admin-store-switch" data-store={store} title="Yönetilen mağaza — değiştirmek için tıklayın">
      <span className="admin-store-switch__dot" aria-hidden="true" />
      <span className="admin-store-switch__icon" aria-hidden="true">
        <Store size={18} />
      </span>
      <span className="admin-store-switch__text">
        <span className="admin-store-switch__label">Yönetilen mağaza</span>
        <select
          value={store}
          disabled={pending}
          onChange={(e) => void onChange(e.target.value)}
          aria-label="Yönetilen mağaza"
        >
          {STORES.map((id) => (
            <option key={id} value={id}>
              {STORE_META[id].label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
