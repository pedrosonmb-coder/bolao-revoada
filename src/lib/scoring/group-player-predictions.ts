import { normalizeName } from './normalize-name'

export type PlayerPredictionGroup = {
  normalized: string
  sample: string
  count: number
}

// Groups raw player name predictions by their normalized form.
// Returns entries sorted by count desc, so the admin sees the most common grafias first.
export function groupPlayerPredictions(rawNames: (string | null | undefined)[]): PlayerPredictionGroup[] {
  const groups = new Map<string, { sample: string; count: number }>()
  for (const name of rawNames) {
    if (!name) continue
    const norm = normalizeName(name)
    if (!norm) continue
    const existing = groups.get(norm)
    if (existing) {
      existing.count++
    } else {
      groups.set(norm, { sample: name, count: 1 })
    }
  }
  return Array.from(groups.entries())
    .map(([normalized, { sample, count }]) => ({ normalized, sample, count }))
    .sort((a, b) => b.count - a.count)
}
