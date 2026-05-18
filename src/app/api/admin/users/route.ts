import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { users, predictions, tournamentPredictions } from '@/lib/db/schema'
import { eq, isNotNull } from 'drizzle-orm'
import { getRanking } from '@/lib/scoring/ranking'

export async function GET(req: NextRequest) {
  const adminOrError = await requireAdmin(req)
  if (adminOrError instanceof NextResponse) return adminOrError

  const allUsers = await db.select().from(users)
  const ranking = await getRanking()
  const rankingByUserId = new Map(ranking.map((e) => [e.user_id, e]))

  const allPreds = await db
    .select({ user_id: predictions.user_id })
    .from(predictions)
    .where(isNotNull(predictions.computed_at))

  const predsCountByUser = new Map<number, number>()
  for (const p of allPreds) {
    predsCountByUser.set(p.user_id, (predsCountByUser.get(p.user_id) ?? 0) + 1)
  }

  const allTournamentPreds = await db.select({ user_id: tournamentPredictions.user_id }).from(tournamentPredictions)
  const hasTournamentPred = new Set(allTournamentPreds.map((tp) => tp.user_id))

  const result = allUsers.map((u) => {
    const entry = rankingByUserId.get(u.id)
    return {
      user_id: u.id,
      telegram_id: u.telegram_id,
      first_name: u.first_name,
      last_name: u.last_name,
      photo_url: u.photo_url,
      is_admin: u.is_admin,
      is_active: u.is_active,
      paid_at: u.paid_at,
      position: entry?.position ?? null,
      total_points: entry?.total_points ?? 0,
      predictions_count: predsCountByUser.get(u.id) ?? 0,
      has_tournament_pred: hasTournamentPred.has(u.id),
    }
  })

  return NextResponse.json({ users: result })
}
