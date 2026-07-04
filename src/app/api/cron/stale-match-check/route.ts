import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const maxDuration = 60
import { matches, matchSnapshots, predictions } from '@/lib/db/schema'
import { and, isNull, isNotNull, lte, inArray, eq, desc } from 'drizzle-orm'
import { verifyCronAuth } from '@/lib/cron-auth'
import { sendNotification } from '@/lib/notifications/send'
import { staleMatchAlertMessage, unscoredMatchAlertMessage } from '@/lib/telegram/messages'
import { env } from '@/lib/env'
import { computeTimeLockDecision } from '@/lib/reconciliation-lock'
import { applyReconciliation } from '@/lib/reconciliation'
import type { ReconciliationResult } from '@/lib/reconciliation'

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  // Check 1: matches with kickoff > 3h ago, no result lock, not cancelled/postponed.
  const threshold = new Date(Date.now() - 3 * 60 * 60 * 1000)

  const stale = await db
    .select()
    .from(matches)
    .where(
      and(
        lte(matches.kickoff_at, threshold),
        isNull(matches.result_locked_at),
        inArray(matches.status, ['scheduled', 'live', 'finished'])
      )
    )

  let alerted = 0
  let auto_locked = 0

  for (const match of stale) {
    // Attempt time-based auto-lock before alerting.
    // Fetches the 15 most recent non-null snapshots to check score stability.
    const recentRows = await db
      .select({
        home_score: matchSnapshots.home_score,
        away_score: matchSnapshots.away_score,
        home_score_pen: matchSnapshots.home_score_pen,
        away_score_pen: matchSnapshots.away_score_pen,
        fetched_at: matchSnapshots.fetched_at,
      })
      .from(matchSnapshots)
      .where(
        and(
          eq(matchSnapshots.match_id, match.id),
          isNotNull(matchSnapshots.home_score),
          isNotNull(matchSnapshots.away_score)
        )
      )
      .orderBy(desc(matchSnapshots.fetched_at))
      .limit(15)

    const kickoffAt =
      match.kickoff_at instanceof Date ? match.kickoff_at : new Date((match.kickoff_at as number) * 1000)

    const timeLock = computeTimeLockDecision({
      kickoffAt,
      now: new Date(),
      recentNonNullSnapshots: recentRows.map((s) => ({
        home_score: s.home_score!,
        away_score: s.away_score!,
        home_score_pen: s.home_score_pen,
        away_score_pen: s.away_score_pen,
        fetched_at: s.fetched_at instanceof Date ? s.fetched_at : new Date((s.fetched_at as number) * 1000),
      })),
    })

    if (timeLock.shouldLock) {
      // Synthesise a 'finished' snapshot so applyReconciliation's existing lock path fires.
      const syntheticResult: ReconciliationResult = {
        kind: 'partial',
        snapshot: {
          source: 'football-data',
          status: 'finished',
          home_score: timeLock.lockScore.home,
          away_score: timeLock.lockScore.away,
          home_score_pen: timeLock.lockScore.home_pen,
          away_score_pen: timeLock.lockScore.away_pen,
          raw_payload: null,
          fetched_at: new Date(),
        },
        only_source: 'time-lock',
      }
      const { locked } = await applyReconciliation(match.id, syntheticResult)
      if (locked) {
        auto_locked++
        console.log(
          JSON.stringify({
            event: 'stale_match_time_locked',
            match_id: match.id,
            score: `${timeLock.lockScore.home}-${timeLock.lockScore.away}`,
            home_pen: timeLock.lockScore.home_pen,
            away_pen: timeLock.lockScore.away_pen,
          })
        )
        continue // skip alert — match is now locked
      }
      // If applyReconciliation returned locked:false (race condition or unexpected), fall through to alert.
      console.log(
        JSON.stringify({
          event: 'stale_match_time_lock_skipped',
          match_id: match.id,
          reason: 'apply_returned_false',
        })
      )
    }

    const text = staleMatchAlertMessage(match)
    const adminIds = env.ADMIN_TELEGRAM_IDS.split(',').map((s) => s.trim())
    for (const adminId of adminIds) {
      const result = await sendNotification({
        type: 'stale_match_alert',
        // Per-admin key so every admin receives exactly 1 DM per stale match
        key: `stale_match_alert:match_${match.id}:${adminId}`,
        chatId: Number(adminId),
        text,
        matchId: match.id,
      })
      if (result.sent) alerted++
    }
  }

  // Check 2: locked matches whose predictions were never scored (recalculation failed at lock time).
  const unscoredPredRows = await db
    .selectDistinct({ match_id: predictions.match_id })
    .from(predictions)
    .where(isNull(predictions.computed_at))

  if (unscoredPredRows.length > 0) {
    const unscoredMatchIds = unscoredPredRows.map((r) => r.match_id)
    const lockedUnscoredMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          isNotNull(matches.result_locked_at),
          inArray(matches.id, unscoredMatchIds)
        )
      )

    const adminIds = env.ADMIN_TELEGRAM_IDS.split(',').map((s) => s.trim())
    for (const match of lockedUnscoredMatches) {
      const text = unscoredMatchAlertMessage(match)
      for (const adminId of adminIds) {
        const result = await sendNotification({
          type: 'stale_unscored_alert',
          key: `stale_unscored:match_${match.id}:${adminId}`,
          chatId: Number(adminId),
          text,
          matchId: match.id,
        })
        if (result.sent) alerted++
      }
    }
  }

  return NextResponse.json({ stale_found: stale.length, auto_locked, alerted })
}
