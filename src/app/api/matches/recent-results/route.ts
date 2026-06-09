import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { db } from '@/lib/db'
import { matches, predictions } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const userOrResponse = await requireUser(req)
  if (userOrResponse instanceof NextResponse) return userOrResponse
  const user = userOrResponse

  const rows = await db
    .select({
      id: matches.id,
      home_team_code: matches.home_team_code,
      home_team_name: matches.home_team_name,
      away_team_code: matches.away_team_code,
      away_team_name: matches.away_team_name,
      home_score: matches.home_score,
      away_score: matches.away_score,
      kickoff_at: matches.kickoff_at,
      status: matches.status,
      pred_home_score: predictions.home_score,
      pred_away_score: predictions.away_score,
      pred_points_awarded: predictions.points_awarded,
    })
    .from(matches)
    .leftJoin(
      predictions,
      and(eq(predictions.match_id, matches.id), eq(predictions.user_id, user.id))
    )
    .where(eq(matches.status, 'finished'))
    .orderBy(desc(matches.kickoff_at))
    .limit(3)

  const results = rows.map((r) => ({
    id: r.id,
    home_team_code: r.home_team_code,
    home_team_name: r.home_team_name,
    away_team_code: r.away_team_code,
    away_team_name: r.away_team_name,
    home_score: r.home_score,
    away_score: r.away_score,
    kickoff_at: r.kickoff_at,
    status: r.status,
    user_prediction:
      r.pred_home_score !== null && r.pred_away_score !== null
        ? {
            home_score: r.pred_home_score,
            away_score: r.pred_away_score,
            points_awarded: r.pred_points_awarded ?? 0,
          }
        : null,
  }))

  return NextResponse.json({ results })
}
