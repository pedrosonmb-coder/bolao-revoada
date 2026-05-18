import type { Match } from '@/lib/db/schema'
import type { MatchSnapshot } from '@/lib/data-sources/types'
import { sendNotification } from './send'
import { reconciliationAlertMessage } from '@/lib/telegram/messages'
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
