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

    return {
      source: 'football-data',
      external_id: String(fd_id),
      status: mapStatus(match.status ?? ''),
      home_score: match.score?.fullTime?.home ?? null,
      away_score: match.score?.fullTime?.away ?? null,
      home_score_pen: match.score?.penalties?.home ?? null,
      away_score_pen: match.score?.penalties?.away ?? null,
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
