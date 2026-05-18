import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { users, matches, predictions, pollingLogs, botMessages } from '@/lib/db/schema'
import { desc, sql, gte } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const adminOrError = await requireAdmin(req)
  if (adminOrError instanceof NextResponse) return adminOrError

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    usersCount,
    matchesCount,
    predictionsCount,
    recentLogs,
    notifsSentToday,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(matches),
    db.select({ count: sql<number>`count(*)` }).from(predictions),
    db.select().from(pollingLogs).orderBy(desc(pollingLogs.ran_at)).limit(20),
    db.select({ count: sql<number>`count(*)` }).from(botMessages).where(gte(botMessages.sent_at, todayStart)),
  ])

  // Última execução por tipo de cron
  const cronTypes = ['poll-fixtures', 'poll-live-matches', 'morning_digest', 'evening_summary', 'post-match-summary', 'pre-match-reminder', 'weekly-recap', 'admin_override', 'admin_cancel']
  const cronStatus: Record<string, { last_run: number | null; last_error: string | null }> = {}

  for (const cron of cronTypes) {
    const last = recentLogs.find((l) => l.endpoint === cron)
    cronStatus[cron] = {
      last_run: last?.ran_at instanceof Date ? Math.floor(last.ran_at.getTime() / 1000) : last?.ran_at != null ? (last.ran_at as unknown as number) : null,
      last_error: last?.error ?? null,
    }
  }

  // Última sincronização com football-data (logs poll-fixtures ou poll-live-matches sem erro)
  const lastSuccessfulPoll = recentLogs.find(
    (l) => (l.endpoint === 'poll-fixtures' || l.endpoint === 'poll-live-matches') && !l.error
  )
  const lastApiSuccess = lastSuccessfulPoll?.ran_at instanceof Date
    ? Math.floor(lastSuccessfulPoll.ran_at.getTime() / 1000)
    : lastSuccessfulPoll?.ran_at != null
      ? (lastSuccessfulPoll.ran_at as unknown as number)
      : null

  return NextResponse.json({
    database: {
      connected: true,
      users_count: usersCount[0]?.count ?? 0,
      matches_count: matchesCount[0]?.count ?? 0,
      predictions_count: predictionsCount[0]?.count ?? 0,
    },
    crons: cronStatus,
    notifications: {
      sent_today: notifsSentToday[0]?.count ?? 0,
    },
    external_apis: {
      football_data: {
        last_success_at: lastApiSuccess,
        status: lastApiSuccess ? 'ok' : 'unknown',
      },
    },
  })
}
