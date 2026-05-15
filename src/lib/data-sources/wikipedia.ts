import type { MatchSnapshot } from './types'

const TIMEOUT_MS = 8_000
const API_URL =
  'https://pt.wikipedia.org/w/api.php?action=parse&page=Copa%20do%20Mundo%20FIFA%20de%202026&format=json&prop=wikitext'

export async function fetchMatchFromWikipedia(
  homeCode: string,
  awayCode: string,
  _date: Date
): Promise<MatchSnapshot | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(API_URL, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) return null

    const data = await res.json()
    const wikitext: string = data?.parse?.wikitext?.['*'] ?? ''

    if (!wikitext) return null

    // Tenta encontrar linha de resultado com ambos os códigos de seleção.
    // Padrão wiki típico: | BRA || ARG || 2–1
    const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(
      `${escaped(homeCode)}[^\\n]*?${escaped(awayCode)}[^\\n]*?(\\d+)[–\\-](\\d+)`,
      'i'
    )
    const match = pattern.exec(wikitext)

    if (!match) return null

    return {
      source: 'wikipedia',
      status: 'finished',
      home_score: parseInt(match[1], 10),
      away_score: parseInt(match[2], 10),
      home_score_pen: null,
      away_score_pen: null,
      raw_payload: { matched_line: match[0] },
      fetched_at: new Date(),
    }
  } catch {
    clearTimeout(timer)
    return null
  }
}
