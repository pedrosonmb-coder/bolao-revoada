import { normalizeName } from './normalize-name'

type TournamentPrediction = {
  champion_code: string | null
  runner_up_code: string | null
  semifinalist_1_code: string | null
  semifinalist_2_code: string | null
  top_scorer_name: string | null
  best_player_name: string | null
  best_young_player_name: string | null
}

type TournamentResult = {
  champion_code: string
  runner_up_code: string
  semifinalists: string[]
  top_scorer_name: string
  best_player_name: string
  best_young_player_name: string
}

// Player name fields accept '|'-separated aliases (e.g. "Mbappé|kylian|k mbappe").
// A prediction matches if it normalizes to any of the aliases.
function matchesAnyAlias(predicted: string | null, officialWithAliases: string): boolean {
  if (!predicted) return false
  const valid = officialWithAliases.split('|').map(normalizeName).filter(Boolean)
  return valid.includes(normalizeName(predicted))
}

// Top-4 com consolação: cada um dos 4 times do palpite pontua pelo MELHOR papel que
// acertou, não pela soma. Acertar o papel exato (campeão/vice) SUBSTITUI a consolação de
// 25 por ter chegado ao top-4 — não soma com ela. Times fora do top-4 real valem 0.
export function calculateTournamentPoints(
  prediction: TournamentPrediction,
  result: TournamentResult
): number {
  let pts = 0

  const realTop4 = new Set([result.champion_code, result.runner_up_code, ...result.semifinalists])

  const predictedSlots: Array<{ team: string | null; role: 'champion' | 'runner_up' | 'other' }> = [
    { team: prediction.champion_code, role: 'champion' },
    { team: prediction.runner_up_code, role: 'runner_up' },
    { team: prediction.semifinalist_1_code, role: 'other' },
    { team: prediction.semifinalist_2_code, role: 'other' },
  ]

  for (const { team, role } of predictedSlots) {
    if (team === null) continue
    if (role === 'champion' && team === result.champion_code) {
      pts += 100
    } else if (role === 'runner_up' && team === result.runner_up_code) {
      pts += 50
    } else if (realTop4.has(team)) {
      pts += 25
    }
  }

  if (matchesAnyAlias(prediction.top_scorer_name, result.top_scorer_name)) pts += 50
  if (matchesAnyAlias(prediction.best_player_name, result.best_player_name)) pts += 50
  if (matchesAnyAlias(prediction.best_young_player_name, result.best_young_player_name)) pts += 25

  return pts
}
