'use client'

import { usePaymentStatus } from '@/hooks/use-payment-status'

export function PaymentPendingBanner() {
  const { isPaid, isLoading } = usePaymentStatus()

  if (isLoading || isPaid) return null

  return (
    <div className="bg-amber-400 text-amber-950 text-sm px-4 py-2.5 sticky top-12 z-20">
      Pagamento pendente. Palpites bloqueados até o admin confirmar.
    </div>
  )
}
