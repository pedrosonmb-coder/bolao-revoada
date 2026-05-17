'use client'

import useSWR from 'swr'
import { swrFetcher } from '@/lib/api/client'

type AppUser = {
  id: number
  telegram_id: number
  first_name: string
  last_name?: string | null
  photo_url?: string | null
  is_admin: boolean
  is_active: boolean
  paid_at?: Date | null
}

export function useMe() {
  const { data, error, isLoading } = useSWR<{ user: AppUser }>('/api/me', swrFetcher)

  return {
    user: data?.user ?? null,
    isLoading,
    error: error?.message ?? null,
  }
}
