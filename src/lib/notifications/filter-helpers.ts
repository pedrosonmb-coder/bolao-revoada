import type { Match } from '@/lib/db/schema'

export function filterMatchesWithoutSummary(
  recentlyFinished: Match[],
  sentMatchIds: Set<number | null>
): Match[] {
  return recentlyFinished.filter((m) => !sentMatchIds.has(m.id))
}
