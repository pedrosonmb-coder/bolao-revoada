import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { getRanking } from '@/lib/scoring/ranking'

const VALID_STAGES = new Set(['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'])

export async function GET(req: NextRequest) {
  const userOrError = await requireUser(req)
  if (userOrError instanceof NextResponse) return userOrError

  const stagesParam = req.nextUrl.searchParams.get('stages')
  let stages: string[] | undefined
  if (stagesParam) {
    const parsed = stagesParam.split(',').map((s) => s.trim()).filter((s) => VALID_STAGES.has(s))
    if (parsed.length > 0) stages = parsed
  }

  const ranking = await getRanking(stages)
  return NextResponse.json({ ranking })
}
