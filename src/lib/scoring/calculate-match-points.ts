import { STAGE_MULTIPLIERS, type Stage } from './multipliers'

type PredictionInput = {
  home_score: number
  away_score: number
  qualified_team_code: 'home' | 'away' | null
}

type MatchResult = {
  stage: Stage
  home_score: number
  away_score: number
  qualified_team_code: 'home' | 'away' | null
}

export type PointsBreakdown = {
  base_points: number
  classification_bonus: number
  multiplier: number
  points_awarded: number
}

// Bônus fixo por acertar o classificado — NÃO escala com o multiplicador de fase
const CLASSIFICATION_BONUS = 8

type Winner = 'home' | 'away' | 'draw'

function getWinner(home: number, away: number): Winner {
  if (home > away) return 'home'
  if (away > home) return 'away'
  return 'draw'
}

export function calculateMatchPoints(
  prediction: PredictionInput,
  match: MatchResult
): PointsBreakdown {
  const realWinner = getWinner(match.home_score, match.away_score)
  const predictedWinner = getWinner(prediction.home_score, prediction.away_score)

  let base_points: number

  if (
    prediction.home_score === match.home_score &&
    prediction.away_score === match.away_score
  ) {
    base_points = 25
  } else if (predictedWinner !== realWinner) {
    base_points = 0
  } else if (realWinner === 'draw') {
    // Empate previsto e ocorrido, mas placar diferente
    base_points = 10
  } else {
    // Vitória prevista e ocorrida — verifica saldo e gols individuais
    const saldoPredicted = prediction.home_score - prediction.away_score
    const saldoReal = match.home_score - match.away_score

    if (saldoPredicted === saldoReal) {
      base_points = 18
    } else {
      const realGolsVencedor =
        realWinner === 'home' ? match.home_score : match.away_score
      const realGolsPerdedor =
        realWinner === 'home' ? match.away_score : match.home_score
      const predGolsVencedor =
        realWinner === 'home' ? prediction.home_score : prediction.away_score
      const predGolsPerdedor =
        realWinner === 'home' ? prediction.away_score : prediction.home_score

      if (predGolsVencedor === realGolsVencedor) {
        base_points = 15
      } else if (predGolsPerdedor === realGolsPerdedor) {
        base_points = 12
      } else {
        base_points = 10
      }
    }
  }

  // FURO 2: derivar effectivePredQTC quando o palpite tem vencedor implícito
  // (palpite 2-1 → qualified_team_code implícito = 'home', sem precisar do seletor)
  const effectivePredQTC: 'home' | 'away' | null =
    prediction.qualified_team_code !== null
      ? prediction.qualified_team_code
      : match.stage !== 'group' && prediction.home_score !== prediction.away_score
      ? prediction.home_score > prediction.away_score
        ? 'home'
        : 'away'
      : null

  // Bônus fixo de +8 (NÃO multiplicado pelo multiplicador de fase)
  const classification_bonus =
    match.stage !== 'group' &&
    effectivePredQTC !== null &&
    match.qualified_team_code !== null &&
    effectivePredQTC === match.qualified_team_code
      ? CLASSIFICATION_BONUS
      : 0

  const multiplier = STAGE_MULTIPLIERS[match.stage]
  // Nova fórmula: bônus fixo NÃO escala com a fase
  const points_awarded = Math.round(base_points * multiplier) + classification_bonus

  return { base_points, classification_bonus, multiplier, points_awarded }
}
