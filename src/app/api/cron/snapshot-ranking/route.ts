import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, rankingSnapshots } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getRanking } from '@/lib/scoring/ranking'
import { verifyCronAuth } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  console.log('[snapshot-ranking] start')
  const start = Date.now()

  const ranking = await getRanking()
  const now = new Date()
  const snapshotDate = now.toISOString().slice(0, 10) // 'YYYY-MM-DD' UTC
  let updated = 0
  let snapshots_inserted = 0

  await Promise.allSettled(
    ranking.map(async (entry) => {
      await db
        .update(users)
        .set({ previous_position: entry.position, position_snapshot_at: now })
        .where(eq(users.id, entry.user_id))
      updated++

      // Best-effort: se a tabela ainda não existir ou houver conflito (2ª execução
      // no mesmo dia), não derruba o UPDATE acima.
      try {
        const result = await db
          .insert(rankingSnapshots)
          .values({
            user_id: entry.user_id,
            position: entry.position,
            total_points: entry.total_points,
            snapshot_date: snapshotDate,
          })
          .onConflictDoNothing()
        if (result.rowsAffected > 0) snapshots_inserted++
      } catch (err) {
        console.warn(`[snapshot-ranking] insert ignorado para user ${entry.user_id}:`, err)
      }
    })
  )

  const duration_ms = Date.now() - start
  const stats = { users_snapshotted: updated, snapshots_inserted, duration_ms }
  console.log('[snapshot-ranking] end', stats)
  return NextResponse.json(stats)
}
