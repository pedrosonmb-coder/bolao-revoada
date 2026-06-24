import { getDisplayName } from '@/lib/display-name'

// Minimal user shape needed for phase ranking — no DB import required
export type PhaseUser = {
  id: number
  telegram_id: number
  display_name: string | null
  first_name: string
  last_name: string | null
  photo_url: string | null
}

export type PhasePred = {
  user_id: number
  match_id: number
  points_awarded: number | null
  base_points: number | null
}

// RankingEntry is defined here (canonical) and re-exported from ranking.ts
export type RankingEntry = {
  user_id: number
  telegram_id: number
  name: string
  photo_url: string | null
  total_points: number
  match_points: number
  tournament_points: number
  exact_scores: number
  winners_correct: number
  position: number
  prev_position: number | null
}

export function buildPhaseRankingEntries(
  activeUsers: PhaseUser[],
  scoredPredictions: PhasePred[],
  matchStageById: Map<number, string>,
  stages: string[]
): RankingEntry[] {
  const stageSet = new Set(stages)

  const predsByUser = new Map<number, PhasePred[]>()
  for (const p of scoredPredictions) {
    const matchStage = matchStageById.get(p.match_id)
    if (!matchStage || !stageSet.has(matchStage)) continue
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

  // Tie-break: phase points → exact_scores → telegram_id (deterministic)
  entries.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    if (b.exact_scores !== a.exact_scores) return b.exact_scores - a.exact_scores
    return a.telegram_id - b.telegram_id
  })

  // Assign positions — true tie when BOTH points and exact_scores are equal
  let pos = 1
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) {
      const prev = entries[i - 1]
      const curr = entries[i]
      const isTrueTie =
        prev.total_points === curr.total_points &&
        prev.exact_scores === curr.exact_scores
      if (!isTrueTie) pos = i + 1
    }
    entries[i].position = pos
  }

  return entries
}
