import { env } from '@/lib/env'
import type { MatchSnapshot } from './types'

const TIMEOUT_MS = 5_000

async function fetchWithRetry(url: string, attempt = 0): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)

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

export async function fetchMatchFromFifa(
  fifa_id: string
): Promise<MatchSnapshot | null> {
  try {
    const url = `${env.FIFA_API_BASE}/calendar/matches/${fifa_id}`
    const res = await fetchWithRetry(url)

    if (res.status === 404) return null
    if (!res.ok) {
      console.warn(`[fifa] HTTP ${res.status} para match ${fifa_id}`)
      return null
    }

    const data = await res.json()

    // Estrutura da API FIFA pode variar; tentar campos comuns.
    // Se mudar, retorna null e o sistema usa as outras fontes.
    const home = data.HomeTeam ?? data.homeTeam
    const away = data.AwayTeam ?? data.awayTeam
    const homeScore = home?.Score ?? home?.score ?? null
    const awayScore = away?.Score ?? away?.score ?? null

    const rawStatus: string = data.MatchStatus ?? data.matchStatus ?? ''
    let status: MatchSnapshot['status'] = null
    if (/finished|completed/i.test(rawStatus)) status = 'finished'
    else if (/live|in.?play/i.test(rawStatus)) status = 'live'
    else if (/scheduled|upcoming/i.test(rawStatus)) status = 'scheduled'
    else if (/postponed/i.test(rawStatus)) status = 'postponed'

    return {
      source: 'fifa',
      external_id: fifa_id,
      status,
      home_score: homeScore !== null ? Number(homeScore) : null,
      away_score: awayScore !== null ? Number(awayScore) : null,
      home_score_pen: data.HomePenaltyScore ?? null,
      away_score_pen: data.AwayPenaltyScore ?? null,
      raw_payload: data,
      fetched_at: new Date(),
    }
  } catch (err) {
    console.error(`[fifa] Erro ao buscar match ${fifa_id}:`, err)
    return null
  }
}
