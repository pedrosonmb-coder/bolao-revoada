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

export function calculateTournamentPoints(
  prediction: TournamentPrediction,
  result: TournamentResult
): number {
  let pts = 0

  if (prediction.champion_code === result.champion_code) pts += 100
  if (prediction.runner_up_code === result.runner_up_code) pts += 50

  const realOtherSemis = result.semifinalists.filter(
    (c) => c !== result.champion_code && c !== result.runner_up_code
  )

  const predictedOtherSemis = [
    prediction.semifinalist_1_code,
    prediction.semifinalist_2_code,
  ].filter((c): c is string => c !== null)

  const counted = new Set<string>()
  for (const code of predictedOtherSemis) {
    if (realOtherSemis.includes(code) && !counted.has(code)) {
      pts += 25
      counted.add(code)
    }
  }

  if (matchesAnyAlias(prediction.top_scorer_name, result.top_scorer_name)) pts += 50
  if (matchesAnyAlias(prediction.best_player_name, result.best_player_name)) pts += 50
  if (matchesAnyAlias(prediction.best_young_player_name, result.best_young_player_name)) pts += 25

  return pts
}
