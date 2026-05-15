import type { MatchSnapshot } from './types'

const TIMEOUT_MS = 8_000
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

async function fetchPage(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) return null
    return res.text()
  } catch {
    clearTimeout(timer)
    return null
  }
}

function extractJsonLd(html: string): unknown[] {
  const results: unknown[] = []
  const regex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1])
      results.push(parsed)
    } catch {
      // fragmento inválido — ignora
    }
  }
  return results
}

export async function fetchMatchFromGE(
  homeCode: string,
  awayCode: string,
  date: Date
): Promise<MatchSnapshot | null> {
  const y = date.getUTCFullYear()
  const m = pad(date.getUTCMonth() + 1)
  const d = pad(date.getUTCDate())

  const url = `https://ge.globo.com/futebol/copa-do-mundo/jogos/${y}/${m}/${d}/`

  let html = await fetchPage(url)

  if (!html) {
    // tenta uma vez sem trailing slash
    html = await fetchPage(url.replace(/\/$/, ''))
  }

  if (!html) {
    console.warn(`[ge] Não conseguiu buscar página de jogos ${y}/${m}/${d}`)
    return null
  }

  const entries = extractJsonLd(html)

  for (const entry of entries) {
    const e = entry as Record<string, unknown>
    if (e['@type'] !== 'SportsEvent') continue

    const competitors = (e.competitor ?? e.homeTeam) as unknown
    if (!competitors) continue

    // Tenta casar pelo código de time no nome ou alternateName
    const homePart = JSON.stringify(competitors).toLowerCase()
    if (!homePart.includes(homeCode.toLowerCase())) continue

    const homeScore = (e.homeTeam as Record<string, unknown>)?.score ?? null
    const awayScore = (e.awayTeam as Record<string, unknown>)?.score ?? null
    const rawStatus = String(e.eventStatus ?? '')
    let status: MatchSnapshot['status'] = null
    if (/EventCompleted|Finished/i.test(rawStatus)) status = 'finished'
    else if (/EventLive|InProgress/i.test(rawStatus)) status = 'live'
    else if (/EventScheduled/i.test(rawStatus)) status = 'scheduled'

    return {
      source: 'ge',
      status,
      home_score: homeScore !== null ? Number(homeScore) : null,
      away_score: awayScore !== null ? Number(awayScore) : null,
      home_score_pen: null,
      away_score_pen: null,
      raw_payload: entry,
      fetched_at: new Date(),
    }
  }

  console.warn(
    `[ge] Nenhum SportsEvent encontrado para ${homeCode} x ${awayCode} em ${y}-${m}-${d}`
  )
  return null
}
