import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { matches } from '@/lib/db/schema'
import { eq, and, gte, lte, type SQL } from 'drizzle-orm'
import { requireUser } from '@/lib/server/auth'

export async function GET(req: NextRequest) {
  const userOrResponse = await requireUser(req)
  if (userOrResponse instanceof NextResponse) return userOrResponse

  const { searchParams } = new URL(req.url)
  const stage = searchParams.get('stage')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const status = searchParams.get('status')

  const conditions: SQL[] = []

  if (stage) conditions.push(eq(matches.stage, stage))
  if (status) conditions.push(eq(matches.status, status))
  if (from) conditions.push(gte(matches.kickoff_at, new Date(from)))
  if (to) conditions.push(lte(matches.kickoff_at, new Date(to)))

  const rows = await db
    .select()
    .from(matches)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(matches.kickoff_at)

  return NextResponse.json({ matches: rows })
}
