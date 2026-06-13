export type MatchResult = {
  match_id: number
  home_team_code: string
  away_team_code: string
  points_awarded: number
  base_points: number
}

export type Distribution = {
  exact: number         // base_points === 25
  score_diff: number    // base_points === 18 (vencedor + saldo)
  winner_goals_w: number // base_points === 15 (vencedor + gols do vencedor)
  winner_goals_l: number // base_points === 12 (vencedor + gols do perdedor)
  winner_only: number   // base_points === 10 (só vencedor)
  miss: number          // base_points === 0
}

export function computeDistribution(preds: { base_points: number }[]): Distribution {
  return {
    exact: preds.filter((p) => p.base_points === 25).length,
    score_diff: preds.filter((p) => p.base_points === 18).length,
    winner_goals_w: preds.filter((p) => p.base_points === 15).length,
    winner_goals_l: preds.filter((p) => p.base_points === 12).length,
    winner_only: preds.filter((p) => p.base_points === 10).length,
    miss: preds.filter((p) => p.base_points === 0).length,
  }
}

export function findBestMatch(preds: MatchResult[]): MatchResult | null {
  if (preds.length === 0) return null
  return preds.reduce((best, p) => (p.points_awarded > best.points_awarded ? p : best))
}

export function findWorstMatch(preds: MatchResult[]): MatchResult | null {
  if (preds.length === 0) return null
  return preds.reduce((worst, p) => (p.points_awarded < worst.points_awarded ? p : worst))
}

export function computeUserAvg(matchPoints: number, matchesPlayed: number): number {
  if (matchesPlayed === 0) return 0
  return matchPoints / matchesPlayed
}

// Drizzle avg() returns string | null for SQLite — caller converts to number before passing
export function computeGroupAvg(avgValue: number | null | undefined): number {
  return avgValue ?? 0
}
