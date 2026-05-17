import { NextRequest, NextResponse } from 'next/server'
import { getGroupStageTeams } from '@/lib/server/teams'
import { requireUser } from '@/lib/server/auth'

export const revalidate = 3600 // 1 hora

export async function GET(req: NextRequest) {
  const userOrResponse = await requireUser(req)
  if (userOrResponse instanceof NextResponse) return userOrResponse

  const teams = await getGroupStageTeams()
  return NextResponse.json({ teams })
}
