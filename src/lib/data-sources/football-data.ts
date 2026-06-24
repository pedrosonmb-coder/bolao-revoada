import { env } from '@/lib/env'
import type { MatchSnapshot, MatchStatus } from './types'

const BASE = 'https://api.football-data.org/v4'
const TIMEOUT_MS = 5_000

function mapStatus(apiStatus: string): MatchStatus | null {
  switch (apiStatus) {
    case 'TIMED':
    case 'SCHEDULED':
      return 'scheduled'
    case 'IN_PLAY':
    case 'PAUSED':
      return 'live'
    case 'FINISHED':
      return 'finished'
    case 'POSTPONED':
    case 'SUSPENDED':
      return 'postponed'
    case 'CANCELLED':
      return 'cancelled'
    default:
      return null
  }
}

type ScorePayload = {
  duration?: string | null
  fullTime?: { home?: number | null; away?: number | null } | null
  extraTime?: { home?: number | null; away?: number | null } | null
  penalties?: { home?: number | null; away?: number | null } | null
}

// FURO 3: exportado para ser testável.
// football-data.org v4: score.fullTime = placar dos 90min APENAS.
// Jogos decididos na prorrogação têm o placar real em score.extraTime.
// score.duration indica o que aconteceu: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'
export function parseScoreFromPayload(score: ScorePayload): {
  home_score: number | null
  away_score: number | null
  home_score_pen: number | null
  away_score_pen: number | null
} {
  const duration = score?.duration ?? null

  let home_score: number | null = score?.fullTime?.home ?? null
  let away_score: number | null = score?.fullTime?.away ?? null

  if (duration === 'EXTRA_TIME' || duration === 'PENALTY_SHOOTOUT') {
    const etHome = score?.extraTime?.home ?? null
    const etAway = score?.extraTime?.away ?? null
    if (etHome !== null && etAway !== null) {
      home_score = etHome
      away_score = etAway
    } else {
      console.warn(
        `[football-data] duration=${duration} mas extraTime null — fallback para fullTime`
      )
    }
  }

  return {
    home_score,
    away_score,
    home_score_pen: score?.penalties?.home ?? null,
    away_score_pen: score?.penalties?.away ?? null,
  }
}

async function fetchWithRetry(url: string, attempt = 0): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      headers: { 'X-Auth-Token': env.FOOTBALL_DATA_API_KEY },
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (res.status === 429 && attempt === 0) {
      await new Promise((r) => setTimeout(r, 60_000))
      return fetchWithRetry(url, 1)
    }

    if (res.status >= 500 && attempt < 2) {
      const delay = [500, 1000, 2000][attempt]
      await new Promise((r) => setTimeout(r, delay))
      return fetchWithRetry(url, attempt + 1)
    }

    return res
  } catch (err) {
    clearTimeout(timer)
    if (attempt < 2) {
      const delay = [500, 1000, 2000][attempt]
      await new Promise((r) => setTimeout(r, delay))
      return fetchWithRetry(url, attempt + 1)
    }
    throw err
  }
}

export async function fetchMatchFromFootballData(
  fd_id: number
): Promise<MatchSnapshot | null> {
  try {
    const res = await fetchWithRetry(`${BASE}/matches/${fd_id}`)

    if (res.status === 404) return null
    if (!res.ok) {
      console.warn(`[football-data] HTTP ${res.status} para match ${fd_id}`)
      return null
    }

    const data = await res.json()
    const match = data.match ?? data
    const scores = parseScoreFromPayload(match.score ?? {})

    return {
      source: 'football-data',
      external_id: String(fd_id),
      status: mapStatus(match.status ?? ''),
      ...scores,
      raw_payload: data,
      fetched_at: new Date(),
    }
  } catch (err) {
    console.error(`[football-data] Erro ao buscar match ${fd_id}:`, err)
    return null
  }
}

export async function fetchAllMatchesFromFootballData(): Promise<unknown[]> {
  const res = await fetchWithRetry(
    `${BASE}/competitions/WC/matches?season=2026`
  )

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `football-data autenticação falhou (HTTP ${res.status}). Verifique FOOTBALL_DATA_API_KEY.`
      )
    }
    throw new Error(`football-data retornou HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.matches ?? []
}
