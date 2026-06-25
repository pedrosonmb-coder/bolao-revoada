// Pure logic for Brazil elimination — no DB imports, fully testable.

export type BrazilMatch = {
  stage: string
  home_team_code: string
  away_team_code: string
  home_score: number | null
  away_score: number | null
  home_score_pen: number | null
  away_score_pen: number | null
  result_locked_at: Date | number | null
}

export function decideBrazilEliminated(
  brazilMatches: BrazilMatch[],
  r32TbdCount: number,
): boolean {
  const locked = brazilMatches.filter((m) => m.result_locked_at !== null)
  const unlocked = brazilMatches.filter((m) => m.result_locked_at === null)

  if (locked.length === 0) return false
  if (unlocked.length > 0) return false

  // All BRA matches are locked — inspect the most recent one (matches arrive kickoff DESC)
  const last = locked[0]

  if (last.stage === 'group') {
    // Between "last group match locked" and "R32 slot assigned", slots are still TBD.
    // Brazil might be one of those TBD teams — don't fire yet.
    if (r32TbdCount > 0) return false
    // R32 fully assigned and BRA not in any of them → eliminated in groups.
    return true
  }

  // Knockout match — determine the winner.
  const braIsHome = last.home_team_code === 'BRA'
  const braGoals = braIsHome ? last.home_score : last.away_score
  const oppGoals = braIsHome ? last.away_score : last.home_score

  if (braGoals === null || oppGoals === null) return false

  if (braGoals < oppGoals) return true  // lost in regulation / ET
  if (braGoals > oppGoals) return false // won; next slot may still be TBD

  // Draw → went to penalties
  const braPen = braIsHome ? last.home_score_pen : last.away_score_pen
  const oppPen = braIsHome ? last.away_score_pen : last.home_score_pen

  if (braPen === null) return false      // scores not yet recorded — conservative
  if (braPen < oppPen!) return true      // lost on penalties
  return false                           // won on penalties
}
