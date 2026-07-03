import { deriveQualifiedTeamCode } from './derive-qualified'

// Resolve o qualified_team_code para um override administrativo.
// Prioridade: explícito (admin envia para empate) > derivado do placar/pênaltis.
// Reutiliza deriveQualifiedTeamCode para não duplicar a lógica de pênaltis.
export function resolveOverrideQualifiedTeamCode(
  stage: string,
  homeScore: number,
  awayScore: number,
  homePen: number | null,
  awayPen: number | null,
  explicitQTC: 'home' | 'away' | undefined
): 'home' | 'away' | null {
  if (explicitQTC !== undefined) return explicitQTC
  return deriveQualifiedTeamCode(homeScore, awayScore, homePen, awayPen, stage)
}
