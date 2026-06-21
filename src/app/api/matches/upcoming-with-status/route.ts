import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { db } from '@/lib/db'
import { matches, predictions } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const userOrResponse = await requireUser(req)
  if (userOrResponse instanceof NextResponse) return userOrResponse
  const user = userOrResponse

  const now = new Date()

  const rows = await db
    .select({
      id: matches.id,
      home_team_code: matches.home_team_code,
      home_team_name: matches.home_team_name,
      away_team_code: matches.away_team_code,
      away_team_name: matches.away_team_name,
      kickoff_at: matches.kickoff_at,
      stage: matches.stage,
      status: matches.status,
      predictions_close_at: matches.predictions_close_at,
      pred_home_score: predictions.home_score,
      pred_away_score: predictions.away_score,
    })
    .from(matches)
    .leftJoin(
      predictions,
      and(eq(predictions.match_id, matches.id), eq(predictions.user_id, user.id))
    )
    .where(eq(matches.status, 'scheduled'))
    .orderBy(asc(matches.kickoff_at))

  const allUpcoming = rows.map((r) => ({
    id: r.id,
    home_team_code: r.home_team_code,
    home_team_name: r.home_team_name,
    away_team_code: r.away_team_code,
    away_team_name: r.away_team_name,
    kickoff_at: r.kickoff_at,
    stage: r.stage,
    status: r.status,
    window_open: r.predictions_close_at > now,
    user_prediction:
      r.pred_home_score !== null && r.pred_away_score !== null
        ? { home_score: r.pred_home_score, away_score: r.pred_away_score }
        : null,
  }))

  const total_pending = allUpcoming.filter((m) => m.window_open && !m.user_prediction).length
  const upcoming = allUpcoming.slice(0, 3)

  return NextResponse.json({ upcoming, total_pending })
}
