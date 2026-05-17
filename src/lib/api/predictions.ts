'use client'

import { apiFetch } from './client'

export type SavePredictionPayload = {
  match_id: number
  home_score: number
  away_score: number
  qualified_team_code?: 'home' | 'away'
}

export async function savePrediction(payload: SavePredictionPayload) {
  return apiFetch('/api/predictions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type TournamentPredictionPayload = {
  champion_code: string
  runner_up_code: string
  semifinalist_1_code: string
  semifinalist_2_code: string
  top_scorer_name: string
  best_player_name: string
  best_young_player_name: string
}

export async function saveTournamentPrediction(payload: TournamentPredictionPayload) {
  return apiFetch('/api/tournament-predictions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
