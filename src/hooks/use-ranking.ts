'use client'

import useSWR from 'swr'
import { swrFetcher } from '@/lib/api/client'
import type { RankingEntry, UserDetail } from '@/lib/scoring/ranking'
import type { Distribution, MatchResult } from '@/lib/scoring/full-ranking-helpers'
import type { BadgeEntry } from '@/lib/scoring/badges'

export type { BadgeEntry }

type RankingResponse = {
  ranking: RankingEntry[]
  phase_status: 'not_started' | 'in_progress' | 'closed' | null
}

export type MatchEntry = {
  match_id: number
  stage: string
  kickoff_at: string
  home_team_code: string
  away_team_code: string
  home_score: number | null
  away_score: number | null
  palpite_home: number
  palpite_away: number
  points_awarded: number
  base_points: number
}

export type PositionPoint = { date: string; position: number; points: number }

export type UserFull = UserDetail & {
  matches: MatchEntry[]
  distribution: Distribution
  best_match: MatchResult | null
  worst_match: MatchResult | null
  group_comparison: { user_avg_per_match: number; group_avg_per_match: number }
  position_history: PositionPoint[]
  badges: BadgeEntry[]
}

export function useRanking(stages?: string[]) {
  const url = stages?.length
    ? `/api/ranking?stages=${stages.join(',')}`
    : '/api/ranking'
  return useSWR<RankingResponse>(url, swrFetcher, {
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

export function useUserFull(userId: number | string | null) {
  return useSWR<UserFull>(
    userId ? `/api/ranking/${userId}/full` : null,
    swrFetcher
  )
}
