'use client'

import useSWR from 'swr'
import { swrFetcher } from '@/lib/api/client'
import type { RankingEntry, UserDetail } from '@/lib/scoring/ranking'

type RankingResponse = { ranking: RankingEntry[] }

export function useRanking() {
  return useSWR<RankingResponse>('/api/ranking', swrFetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })
}

export function useUserDetail(userId: number | null) {
  return useSWR<UserDetail>(
    userId ? `/api/ranking/${userId}` : null,
    swrFetcher
  )
}
