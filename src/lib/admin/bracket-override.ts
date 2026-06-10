import { getTeamName } from '@/lib/teams'

export type BracketOverrideInput = {
  home_team_code: string
  away_team_code: string
  stage: string
}

export type BracketOverrideResult =
  | { valid: true; home_name: string; away_name: string }
  | { valid: false; error: string; status: number }

export function validateBracketOverride(input: BracketOverrideInput): BracketOverrideResult {
  if (input.stage === 'group') {
    return {
      valid: false,
      error: 'Redefinição de times não permitida em jogos de grupos',
      status: 400,
    }
  }

  const homeName = getTeamName(input.home_team_code)
  if (!homeName) {
    return { valid: false, error: `TLA inválido: ${input.home_team_code}`, status: 400 }
  }

  const awayName = getTeamName(input.away_team_code)
  if (!awayName) {
    return { valid: false, error: `TLA inválido: ${input.away_team_code}`, status: 400 }
  }

  return { valid: true, home_name: homeName, away_name: awayName }
}
