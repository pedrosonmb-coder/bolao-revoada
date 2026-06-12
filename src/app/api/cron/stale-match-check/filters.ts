export function filterUnscoredLockedMatches<T extends { id: number }>(
  lockedMatches: T[],
  unscoredMatchIds: Set<number>
): T[] {
  return lockedMatches.filter((m) => unscoredMatchIds.has(m.id))
}

export function isStaleUnlocked(
  kickoff_at: Date | number,
  result_locked_at: Date | number | null,
  threshold: Date
): boolean {
  if (result_locked_at !== null) return false
  const kickoff = kickoff_at instanceof Date ? kickoff_at : new Date((kickoff_at as number) * 1000)
  return kickoff <= threshold
}
