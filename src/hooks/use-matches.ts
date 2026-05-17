'use client'

import useSWR from 'swr'
import { swrFetcher } from '@/lib/api/client'
import type { Match } from '@/lib/db/schema'

type MatchesResponse = { matches: Match[] }

export function useMatches(stage?: string) {
  const url = stage ? `/api/matches?stage=${stage}` : '/api/matches'
  const { data, error, isLoading } = useSWR<MatchesResponse>(url, swrFetcher)

  return {
    matches: data?.matches ?? [],
    isLoading,
    error: error?.message ?? null,
  }
}
