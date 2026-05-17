import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { predictions } from '@/lib/db/schema'
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
    })
    .from(predictions)
    .where(eq(predictions.user_id, user.id))

  return NextResponse.json({ predictions: rows })
}
