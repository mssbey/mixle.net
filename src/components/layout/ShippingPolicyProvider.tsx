'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { NO_SHIPPING_POLICY, type PublicShippingPolicy } from '@/lib/shipping-text';

const ShippingPolicyContext = createContext<PublicShippingPolicy>(NO_SHIPPING_POLICY);

/** Mağazanın kargo özeti (layout'ta sunucudan okunur). */
export function ShippingPolicyProvider({ value, children }: { value: PublicShippingPolicy; children: ReactNode }) {
  return <ShippingPolicyContext.Provider value={value}>{children}</ShippingPolicyContext.Provider>;
}

export const useShippingPolicy = () => useContext(ShippingPolicyContext);
