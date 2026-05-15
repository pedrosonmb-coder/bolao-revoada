import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { matches, matchSnapshots, pollingLogs } from '@/lib/db/schema'
import { desc, sql, eq, isNotNull } from 'drizzle-orm'
import { env } from '@/lib/env'

function verifyAdminAuth(req: NextRequest): NextResponse | null {
  const adminId = req.headers.get('x-admin-id')
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const allowed = env.ADMIN_TELEGRAM_IDS.split(',').map((s) => s.trim())
  if (!allowed.includes(adminId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const authError = verifyAdminAuth(req)
  if (authError) return authError

  const [recentLogs, statusSummary, lockedCount, recentSnapshots] =
    await Promise.all([
      db
        .select()
        .from(pollingLogs)
        .orderBy(desc(pollingLogs.ran_at))
        .limit(50),

      db
        .select({
          status: matches.status,
          count: sql<number>`count(*)`,
        })
        .from(matches)
        .groupBy(matches.status),

      db
        .select({ count: sql<number>`count(*)` })
        .from(matches)
        .where(isNotNull(matches.result_locked_at)),

      // Snapshots recentes para detectar conflitos: últimos 10 por jogo vivo
      db
        .select()
        .from(matchSnapshots)
        .orderBy(desc(matchSnapshots.fetched_at))
        .limit(200),
    ])

  // Detecta conflitos: agrupa snapshots por match_id e verifica divergência
  const byMatch: Record<number, typeof recentSnapshots> = {}
  for (const s of recentSnapshots) {
    if (!byMatch[s.match_id]) byMatch[s.match_id] = []
    byMatch[s.match_id].push(s)
  }

  const conflicts = Object.entries(byMatch)
    .map(([matchId, snaps]) => {
      const scores = new Set(snaps.map((s) => `${s.home_score}-${s.away_score}-${s.status}`))
      if (scores.size <= 1) return null
      return { match_id: Number(matchId), snapshots: snaps, distinct_results: [...scores] }
    })
    .filter(Boolean)

  return NextResponse.json({
    recent_logs: recentLogs,
    conflicts,
    match_status_summary: statusSummary,
    locked_count: lockedCount[0]?.count ?? 0,
  })
}
