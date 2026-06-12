import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { matches, predictions } from '@/lib/db/schema'
import { and, isNull, isNotNull, lte, inArray } from 'drizzle-orm'
import { verifyCronAuth } from '@/lib/cron-auth'
import { sendNotification } from '@/lib/notifications/send'
import { staleMatchAlertMessage, unscoredMatchAlertMessage } from '@/lib/telegram/messages'
import { env } from '@/lib/env'

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

  for (const match of stale) {
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

  return NextResponse.json({ stale_found: stale.length, alerted })
}
