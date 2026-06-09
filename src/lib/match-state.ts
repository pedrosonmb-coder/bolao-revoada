export type MatchPredictionState =
  | 'no_prediction_open'
  | 'predicted_open'
  | 'predicted_locked'
  | 'no_prediction_locked'

export function getMatchPredictionState(match: {
  window_open: boolean
  user_prediction: { home_score: number; away_score: number } | null
}): MatchPredictionState {
  if (match.window_open && !match.user_prediction) return 'no_prediction_open'
  if (match.window_open && match.user_prediction) return 'predicted_open'
  if (!match.window_open && match.user_prediction) return 'predicted_locked'
  return 'no_prediction_locked'
}
