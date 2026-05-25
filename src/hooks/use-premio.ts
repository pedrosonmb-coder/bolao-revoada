'use client'

import useSWR from 'swr'
import { swrFetcher } from '@/lib/api/client'

export type PremioStatus = {
  entry_fee: number
  total_amount: number
  paid_count: number
  total_count: number
  prizes: {
    first: number
    second: number
    third: number
  }
  participants: {
    id: number
    first_name: string
    is_paid: boolean
  }[]
}

export function usePremio() {
  return useSWR<PremioStatus>('/api/premio/status', swrFetcher)
}
