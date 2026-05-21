'use client'

import { useMe } from './use-me'

export function usePaymentStatus() {
  const { user, isLoading } = useMe()

  return {
    isPaid: !!user?.paid_at,
    isLoading,
    paidAt: user?.paid_at ?? null,
  }
}
