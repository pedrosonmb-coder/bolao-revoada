// Require N non-null snapshots to agree before locking. When status is confirmed
// 'finished' and fewer than LOCK_THRESHOLD are available, floor at LOCK_THRESHOLD_FLOOR
// to avoid blocking on sources that never respond (e.g. FIFA silent for group stage).
export const LOCK_THRESHOLD = 10
export const LOCK_THRESHOLD_FLOOR = 3

export type LockDecision =
  | { shouldLock: true; lockScore: { home: number; away: number } }
  | { shouldLock: false; lockScore: null }

/**
 * Pure function — determines whether to lock based on status, source reliability,
 * and the N most-recent non-null snapshots from the DB.
 *
 * Accepts 'partial' (single source) in addition to 'agreed' so that matches where
 * only football-data responds (FIFA silent) still lock correctly.
 *
 * When at least one snapshot in recentNonNullSnapshots has status='finished',
 * only finished snapshots are used for consensus. This prevents halftime/live
 * scores from blocking a stable final result.
 *
 * Never locks if fewer than LOCK_THRESHOLD_FLOOR candidate snapshots are available,
 * or if their scores diverge.
 */
export function computeLockDecision(params: {
  snapshotStatus: string | null
  resultKind: 'agreed' | 'partial' | 'conflict' | 'all_failed'
  recentNonNullSnapshots: Array<{ home_score: number; away_score: number; status: string | null }>
}): LockDecision {
  const { snapshotStatus, resultKind, recentNonNullSnapshots } = params

  if (snapshotStatus !== 'finished') return { shouldLock: false, lockScore: null }
  if (resultKind !== 'agreed' && resultKind !== 'partial') return { shouldLock: false, lockScore: null }

  // Prefer finished-only snapshots when available — ignore halftime/live scores
  // that precede the confirmed end of the match.
  const hasFinished = recentNonNullSnapshots.some((s) => s.status === 'finished')
  const candidates = hasFinished
    ? recentNonNullSnapshots.filter((s) => s.status === 'finished')
    : recentNonNullSnapshots

  if (candidates.length < LOCK_THRESHOLD_FLOOR) return { shouldLock: false, lockScore: null }

  const N = Math.min(LOCK_THRESHOLD, candidates.length)
  const sample = candidates.slice(0, N)
  const { home_score, away_score } = sample[0]
  const allAgree = sample.every((s) => s.home_score === home_score && s.away_score === away_score)
  if (!allAgree) return { shouldLock: false, lockScore: null }

  return { shouldLock: true, lockScore: { home: home_score, away: away_score } }
}
