export function deriveQualifiedTeamCode(
  homeScore: number,
  awayScore: number,
  homePen: number | null,
  awayPen: number | null,
  stage: string
): 'home' | 'away' | null {
  if (stage === 'group') return null
  if (homeScore > awayScore) return 'home'
  if (awayScore > homeScore) return 'away'
  // Empate no placar — quem fez mais pênaltis avança
  if (homePen !== null && awayPen !== null) {
    return homePen > awayPen ? 'home' : 'away'
  }
  return null
}
