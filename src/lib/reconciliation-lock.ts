// Require N non-null snapshots to agree before locking. When status is confirmed
// 'finished' and fewer than LOCK_THRESHOLD are available, floor at LOCK_THRESHOLD_FLOOR
// to avoid blocking on sources that never respond (e.g. FIFA silent for group stage).
export const LOCK_THRESHOLD = 10
export const LOCK_THRESHOLD_FLOOR = 3

// Time-based fallback lock: used when the API never transitions to 'finished'.
// Validated against ESP×KSA (5-0 errado, 12 min) — neither threshold was met.
export const TIME_LOCK_KICKOFF_HOURS = 3
export const TIME_LOCK_STABILITY_MINUTES = 30

export type LockDecision =
  | { shouldLock: true; lockScore: { home: number; away: number } }
  | { shouldLock: false; lockScore: null; reason: string }

export type TimeLockDecision =
  | { shouldLock: true; lockScore: { home: number; away: number; home_pen: number | null; away_pen: number | null } }
  | { shouldLock: false; lockScore: null; reason: string }

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
  peakScore?: { home: number; away: number } | null
}): LockDecision {
  const { snapshotStatus, resultKind, recentNonNullSnapshots, peakScore } = params

  if (snapshotStatus !== 'finished') return { shouldLock: false, lockScore: null, reason: 'status_not_finished' }
  if (resultKind !== 'agreed' && resultKind !== 'partial') return { shouldLock: false, lockScore: null, reason: 'invalid_result_kind' }

  // Prefer finished-only snapshots when available — ignore halftime/live scores
  // that precede the confirmed end of the match.
  const hasFinished = recentNonNullSnapshots.some((s) => s.status === 'finished')
  const candidates = hasFinished
    ? recentNonNullSnapshots.filter((s) => s.status === 'finished')
    : recentNonNullSnapshots

  if (candidates.length < LOCK_THRESHOLD_FLOOR) return { shouldLock: false, lockScore: null, reason: 'insufficient_snapshots' }

  const N = Math.min(LOCK_THRESHOLD, candidates.length)
  const sample = candidates.slice(0, N)
  const { home_score, away_score } = sample[0]
  const allAgree = sample.every((s) => s.home_score === home_score && s.away_score === away_score)
  if (!allAgree) return { shouldLock: false, lockScore: null, reason: 'scores_diverge' }

  // Regression guard: if either team's score dropped below the historical peak seen
  // across all snapshots, the source likely reverted a goal erroneously. Block the
  // immediate lock — the time-lock (kickoff+3h, stable 30min) handles it later,
  // which covers both data errors (source corrects itself) and VAR (score stays stable).
  if (peakScore != null) {
    if (home_score < peakScore.home || away_score < peakScore.away) {
      return { shouldLock: false, lockScore: null, reason: 'regression_detected' }
    }
  }

  return { shouldLock: true, lockScore: { home: home_score, away: away_score } }
}

/**
 * Pure function — fallback lock for when the API is stuck in 'live' and never sends
 * 'finished'. Requires ALL of:
 *   1. kickoffAt >= TIME_LOCK_KICKOFF_HOURS ago (covers 90min + ET + pens + margin)
 *   2. all provided snapshots agree on the same score (including pen scores)
 *   3. time span between oldest and newest snapshot >= TIME_LOCK_STABILITY_MINUTES
 *   4. at least LOCK_THRESHOLD_FLOOR snapshots
 *
 * Does NOT modify computeLockDecision — the normal 'finished'-status path is unchanged.
 */
export function computeTimeLockDecision(params: {
  kickoffAt: Date
  now: Date
  recentNonNullSnapshots: Array<{
    home_score: number
    away_score: number
    home_score_pen: number | null
    away_score_pen: number | null
    fetched_at: Date
  }>
}): TimeLockDecision {
  const { kickoffAt, now, recentNonNullSnapshots } = params

  const elapsedMs = now.getTime() - kickoffAt.getTime()
  if (elapsedMs < TIME_LOCK_KICKOFF_HOURS * 60 * 60 * 1000) {
    return { shouldLock: false, lockScore: null, reason: 'kickoff_too_recent' }
  }

  if (recentNonNullSnapshots.length < LOCK_THRESHOLD_FLOOR) {
    return { shouldLock: false, lockScore: null, reason: 'insufficient_snapshots' }
  }

  const { home_score, away_score, home_score_pen, away_score_pen } = recentNonNullSnapshots[0]
  const allAgree = recentNonNullSnapshots.every(
    (s) =>
      s.home_score === home_score &&
      s.away_score === away_score &&
      s.home_score_pen === home_score_pen &&
      s.away_score_pen === away_score_pen
  )
  if (!allAgree) {
    return { shouldLock: false, lockScore: null, reason: 'score_unstable' }
  }

  const newest = recentNonNullSnapshots[0].fetched_at.getTime()
  const oldest = recentNonNullSnapshots[recentNonNullSnapshots.length - 1].fetched_at.getTime()
  const spanMs = newest - oldest
  if (spanMs < TIME_LOCK_STABILITY_MINUTES * 60 * 1000) {
    return { shouldLock: false, lockScore: null, reason: 'span_too_short' }
  }

  return {
    shouldLock: true,
    lockScore: { home: home_score, away: away_score, home_pen: home_score_pen, away_pen: away_score_pen },
  }
}
