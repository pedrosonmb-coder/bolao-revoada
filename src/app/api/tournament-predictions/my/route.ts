import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tournamentPredictions } from '@/lib/db/schema'
import { requireUser } from '@/lib/server/auth'

export async function GET(req: NextRequest) {
  const userOrResponse = await requireUser(req)
  if (userOrResponse instanceof NextResponse) return userOrResponse
  const user = userOrResponse

  const prediction = await db
    .select()
    .from(tournamentPredictions)
    .where(eq(tournamentPredictions.user_id, user.id))
    .get()

  return NextResponse.json({ prediction: prediction ?? null })
}
