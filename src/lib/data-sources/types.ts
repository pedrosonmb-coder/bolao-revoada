export type DataSource = 'football-data' | 'fifa' | 'ge' | 'wikipedia'

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled'

export type MatchSnapshot = {
  source: DataSource
  external_id?: string
  status: MatchStatus | null
  home_score: number | null
  away_score: number | null
  home_score_pen: number | null
  away_score_pen: number | null
  raw_payload: unknown
  fetched_at: Date
}
