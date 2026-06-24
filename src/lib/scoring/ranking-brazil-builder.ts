import { getDisplayName } from '@/lib/display-name'
import type { PhaseUser, PhasePred, RankingEntry } from './ranking-phase-builder'

export function buildBrazilRankingEntries(
  activeUsers: PhaseUser[],
  scoredPredictions: PhasePred[],
  brazilMatchIds: Set<number>
): RankingEntry[] {
  const predsByUser = new Map<number, PhasePred[]>()
  for (const p of scoredPredictions) {
    if (!brazilMatchIds.has(p.match_id)) continue
    const list = predsByUser.get(p.user_id) ?? []
    list.push(p)
    predsByUser.set(p.user_id, list)
  }

  const entries: RankingEntry[] = activeUsers.map((u) => {
    const preds = predsByUser.get(u.id) ?? []
    const match_points = preds.reduce((acc, p) => acc + (p.points_awarded ?? 0), 0)
    const exact_scores = preds.filter((p) => p.base_points === 25).length
    return {
      user_id: u.id,
      telegram_id: u.telegram_id,
      name: getDisplayName(u),
      photo_url: u.photo_url,
      total_points: match_points,
      match_points,
      tournament_points: 0,
      exact_scores,
      winners_correct: preds.filter((p) => (p.base_points ?? 0) >= 10).length,
      position: 0,
      prev_position: null,
    }
  })

  // Tie-break: points → exact_scores → telegram_id (deterministic)
  entries.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    if (b.exact_scores !== a.exact_scores) return b.exact_scores - a.exact_scores
    return a.telegram_id - b.telegram_id
  })

  // True tie = same points AND same exact_scores → same position
  let pos = 1
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) {
      const prev = entries[i - 1]
      const curr = entries[i]
      const isTrueTie =
        prev.total_points === curr.total_points && prev.exact_scores === curr.exact_scores
      if (!isTrueTie) pos = i + 1
    }
    entries[i].position = pos
  }

  return entries
}
