// Pure tournament ranking logic — no DB imports, fully testable.
import { getDisplayName } from '@/lib/display-name'
import type { PhaseUser, RankingEntry } from './ranking-phase-builder'

export type TournamentPred = {
  user_id: number
  points_awarded: number | null
  closed_at: Date | number | null
  computed_at: Date | number | null
}

export function getTournamentPhaseStatus(
  preds: TournamentPred[],
): 'not_started' | 'closed' {
  return preds.some((p) => p.computed_at !== null) ? 'closed' : 'not_started'
}

function closedAtMs(p: TournamentPred): number {
  if (p.closed_at === null) return Infinity
  return p.closed_at instanceof Date ? p.closed_at.getTime() : p.closed_at * 1000
}

export function buildTournamentRankingEntries(
  activeUsers: PhaseUser[],
  preds: TournamentPred[],
): RankingEntry[] {
  const pointsByUser = new Map<number, number>()
  const closedAtByUser = new Map<number, number>()

  for (const p of preds) {
    pointsByUser.set(p.user_id, p.points_awarded ?? 0)
    closedAtByUser.set(p.user_id, closedAtMs(p))
  }

  const entries: RankingEntry[] = activeUsers.map((u) => {
    const tournament_points = pointsByUser.get(u.id) ?? 0
    return {
      user_id: u.id,
      telegram_id: u.telegram_id,
      name: getDisplayName(u),
      photo_url: u.photo_url,
      total_points: tournament_points,
      match_points: 0,
      tournament_points,
      exact_scores: 0,
      winners_correct: 0,
      position: 0,
      prev_position: null,
    }
  })

  // Sort: points DESC, then closed_at ASC (nulls last), then telegram_id ASC
  entries.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    const aAt = closedAtByUser.get(a.user_id) ?? Infinity
    const bAt = closedAtByUser.get(b.user_id) ?? Infinity
    if (aAt !== bAt) return aAt - bAt
    return a.telegram_id - b.telegram_id
  })

  // True tie = same points AND same closed_at (or both never submitted)
  let pos = 1
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) {
      const prev = entries[i - 1]
      const curr = entries[i]
      const prevAt = closedAtByUser.get(prev.user_id) ?? Infinity
      const currAt = closedAtByUser.get(curr.user_id) ?? Infinity
      const isTrueTie = prev.total_points === curr.total_points && prevAt === currAt
      if (!isTrueTie) pos = i + 1
    }
    entries[i].position = pos
  }

  return entries
}
