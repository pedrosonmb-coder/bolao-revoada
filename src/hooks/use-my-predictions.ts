'use client'

import useSWR from 'swr'
import { swrFetcher } from '@/lib/api/client'

export type MyPrediction = {
  match_id: number
  home_score: number
  away_score: number
  qualified_team_code: string | null
  updated_at: Date | null
}

export function useMyPredictions() {
  const { data, error, isLoading, mutate } = useSWR<{ predictions: MyPrediction[] }>(
    '/api/predictions/my',
    swrFetcher
  )

  const predictionsMap = new Map<number, MyPrediction>()
  for (const p of data?.predictions ?? []) {
    predictionsMap.set(p.match_id, p)
  }

  return {
    predictions: data?.predictions ?? [],
    predictionsMap,
    isLoading,
    error: error?.message ?? null,
    mutate,
  }
}
