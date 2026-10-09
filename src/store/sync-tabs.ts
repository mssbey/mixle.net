'use client';

/**
 * localStorage'da tutulan bir store'u diğer sekmelerle eşitler. Her sekme kendi
 * bellekteki kopyasından yazdığı için, eşitlenmezse son yazan sekme diğerlerinin
 * eklediklerini ezer. Başka sekme anahtarı değiştirince buradaki kopya yeniden okunur.
 */
export function syncAcrossTabs(store: { persist: { rehydrate: () => unknown } }, key: string) {
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', (e) => {
    if (e.storageArea === localStorage && (e.key === key || e.key === null)) void store.persist.rehydrate();
  });
}
