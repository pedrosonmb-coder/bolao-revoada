import type { MatchSnapshot } from './types'

export function isPlausibleSnapshot(s: MatchSnapshot): boolean {
  const { home_score, away_score } = s
  // Both null → plausible (scheduled/live without score yet)
  if (home_score === null && away_score === null) return true
  // Both non-null → validate range [0, 20]
  if (home_score !== null && away_score !== null) {
    return home_score >= 0 && home_score <= 20 && away_score >= 0 && away_score <= 20
  }
  // One null, one non-null → unusual but allowed (e.g. transient live data)
  return true
}

// Determines which snapshots enter findConsensus.
//
// Wikipedia (regex scraper) is last resort: it only counts when no structured source
// (football-data, FIFA, GE) returned a plausible snapshot. This prevents bad regex
// matches from blocking consensus — e.g. USA×PAR 2026-06-13 where Wikipedia produced
// "2025-8" from a year-reference on the same wikitext line, causing 7h of conflict.
export function selectConsensusSnapshots(params: {
  phase1Snapshots: MatchSnapshot[]  // football-data + FIFA, already plausibility-filtered
  geSnapshot: MatchSnapshot | null
  wikiSnapshot: MatchSnapshot | null
}): MatchSnapshot[] {
  const { phase1Snapshots, geSnapshot, wikiSnapshot } = params

  const geValid = geSnapshot && isPlausibleSnapshot(geSnapshot) ? geSnapshot : null
  const result: MatchSnapshot[] = [...phase1Snapshots, ...(geValid ? [geValid] : [])]

  // Wikipedia: only if no structured source responded with a plausible score
  if (result.length === 0 && wikiSnapshot && isPlausibleSnapshot(wikiSnapshot)) {
    result.push(wikiSnapshot)
  }

  return result
}
