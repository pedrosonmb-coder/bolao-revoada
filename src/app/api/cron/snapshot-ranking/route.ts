import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
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
  let updated = 0

  await Promise.allSettled(
    ranking.map(async (entry) => {
      await db
        .update(users)
        .set({ previous_position: entry.position, position_snapshot_at: now })
        .where(eq(users.id, entry.user_id))
      updated++
    })
  )

  const duration_ms = Date.now() - start
  const stats = { users_snapshotted: updated, duration_ms }
  console.log('[snapshot-ranking] end', stats)
  return NextResponse.json(stats)
}
