import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { getRanking } from '@/lib/scoring/ranking'

export async function GET(req: NextRequest) {
  const userOrError = await requireUser(req)
  if (userOrError instanceof NextResponse) return userOrError

  const ranking = await getRanking()
  return NextResponse.json({ ranking })
}
