import type { Match } from '@/lib/db/schema'
import type { MatchSnapshot } from '@/lib/data-sources/types'
import { sendNotification } from './send'
import { reconciliationAlertMessage, penaltyCheckAlertMessage, missingQualifierAlertMessage, lockReviewAlertMessage, tournamentRequiredAlertMessage, knockoutDrawPendingAlertMessage } from '@/lib/telegram/messages'
import { env } from '@/lib/env'

export async function alertAdminConflict(
  match: Match,
  snapshots: MatchSnapshot[]
): Promise<void> {
  const adminIds = env.ADMIN_TELEGRAM_IDS.split(',').map((s) => s.trim())
  const adminUrl = `${env.NEXT_PUBLIC_APP_URL}/api/admin/polling-status`
  const today = new Date().toISOString().slice(0, 10)

  const text = reconciliationAlertMessage(
    match.id,
    match.home_team_name,
    match.away_team_name,
    adminUrl
  )

  for (const adminId of adminIds) {
    await sendNotification({
      type: 'reconciliation_alert',
      key: `reconciliation_alert:match_${match.id}:${today}`,
      chatId: Number(adminId),
      text,
      matchId: match.id,
      payload: { snapshots: snapshots.map((s) => ({ source: s.source, home: s.home_score, away: s.away_score })) },
    })
  }
}

// Dispara no momento em que a guarda BLOQUEIA o lock (jogo ainda não travado —
// diferente de alertAdminMissingQualifier, que avisa depois que já travou empatado).
export async function alertAdminKnockoutDrawPending(match: Match): Promise<void> {
  const adminIds = env.ADMIN_TELEGRAM_IDS.split(',').map((s) => s.trim())
  const text = knockoutDrawPendingAlertMessage(match)
  for (const adminId of adminIds) {
    await sendNotification({
      type: 'knockout_draw_pending_alert',
      key: `knockout_draw_pending_alert:match_${match.id}`,
      chatId: Number(adminId),
      text,
      matchId: match.id,
    })
  }
}

export async function alertAdminMissingQualifier(match: Match): Promise<void> {
  const adminIds = env.ADMIN_TELEGRAM_IDS.split(',').map((s) => s.trim())
  const text = missingQualifierAlertMessage(match)
  for (const adminId of adminIds) {
    await sendNotification({
      type: 'missing_qualifier_alert',
      key: `missing_qualifier_alert:match_${match.id}`,
      chatId: Number(adminId),
      text,
      matchId: match.id,
    })
  }
}

export async function alertAdminTournamentRequired(match: Match): Promise<void> {
  const adminIds = env.ADMIN_TELEGRAM_IDS.split(',').map((s) => s.trim())
  const text = tournamentRequiredAlertMessage(match.id)
  for (const adminId of adminIds) {
    await sendNotification({
      type: 'tournament_required_alert',
      key: `tournament_required_alert:match_${match.id}`,
      chatId: Number(adminId),
      text,
      matchId: match.id,
    })
  }
}

export async function alertAdminLockReview(
  match: Match,
  opts: { regressionSuspected: boolean; peakScore?: { home: number; away: number } | null }
): Promise<void> {
  const adminIds = env.ADMIN_TELEGRAM_IDS.split(',').map((s) => s.trim())
  const text = lockReviewAlertMessage(match, opts.regressionSuspected, opts.peakScore)
  for (const adminId of adminIds) {
    await sendNotification({
      type: 'lock_review',
      key: `lock_review:match_${match.id}:${adminId}`,
      chatId: Number(adminId),
      text,
      matchId: match.id,
    })
  }
}

export async function alertAdminPenaltyCheck(match: Match): Promise<void> {
  const adminIds = env.ADMIN_TELEGRAM_IDS.split(',').map((s) => s.trim())
  const text = penaltyCheckAlertMessage(match)
  for (const adminId of adminIds) {
    await sendNotification({
      type: 'penalty_check',
      key: `penalty_check:match_${match.id}`,
      chatId: Number(adminId),
      text,
      matchId: match.id,
    })
  }
}
