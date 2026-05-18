import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, pollingLogs } from '@/lib/db/schema'
import { sql, desc } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET() {
  const timestamp = Math.floor(Date.now() / 1000)
  let dbOk = true
  let dbLatency = 0

  try {
    const t0 = Date.now()
    await db.select({ count: sql<number>`count(*)` }).from(users)
    dbLatency = Date.now() - t0
  } catch {
    dbOk = false
  }

  let lastApiSuccess: number | null = null
  try {
    const lastLog = await db
      .select()
      .from(pollingLogs)
      .orderBy(desc(pollingLogs.ran_at))
      .limit(10)

    const successLog = lastLog.find(
      (l) => (l.endpoint === 'poll-fixtures' || l.endpoint === 'poll-live-matches') && !l.error
    )
    if (successLog) {
      lastApiSuccess = successLog.ran_at instanceof Date
        ? Math.floor(successLog.ran_at.getTime() / 1000)
        : (successLog.ran_at as number)
    }
  } catch {
    // não crítico
  }

  // API considerada ok se houve sync nas últimas 6h
  const apiOk = lastApiSuccess !== null && (timestamp - lastApiSuccess) < 3600 * 6

  let status: 'ok' | 'degraded' | 'down' = 'ok'
  if (!dbOk) status = 'down'
  else if (!apiOk) status = 'degraded'

  return NextResponse.json(
    {
      status,
      timestamp,
      checks: {
        database: { status: dbOk ? 'ok' : 'down', latency_ms: dbLatency },
        football_data_api: {
          status: apiOk ? 'ok' : 'degraded',
          last_success_at: lastApiSuccess,
        },
      },
      version: '0.7.0',
    },
    { status: status === 'down' ? 503 : 200 }
  )
}
