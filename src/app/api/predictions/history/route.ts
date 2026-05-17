import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { predictions, matches } from '@/lib/db/schema'
import { requireUser } from '@/lib/server/auth'

export async function GET(req: NextRequest) {
  const userOrResponse = await requireUser(req)
  if (userOrResponse instanceof NextResponse) return userOrResponse
  const user = userOrResponse

  const rows = await db
    .select({
      match_id: predictions.match_id,
      home_score: predictions.home_score,
      away_score: predictions.away_score,
      qualified_team_code: predictions.qualified_team_code,
      updated_at: predictions.updated_at,
      match: {
        id: matches.id,
        stage: matches.stage,
        group_name: matches.group_name,
        home_team_code: matches.home_team_code,
        home_team_name: matches.home_team_name,
        away_team_code: matches.away_team_code,
        away_team_name: matches.away_team_name,
        kickoff_at: matches.kickoff_at,
        predictions_close_at: matches.predictions_close_at,
        status: matches.status,
      },
    })
    .from(predictions)
    .innerJoin(matches, eq(predictions.match_id, matches.id))
    .where(eq(predictions.user_id, user.id))
    .orderBy(matches.kickoff_at)

  return NextResponse.json({ predictions: rows })
}
