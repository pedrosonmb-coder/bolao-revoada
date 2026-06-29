import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { getRanking } from '@/lib/scoring/ranking'
import { getActiveBadgesAndChampions } from '@/lib/scoring/badges'
import { getPhaseStatus } from '@/lib/notifications/queries'
import type { PhaseStatus } from '@/lib/notifications/queries'

const VALID_STAGES = new Set(['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'])

export async function GET(req: NextRequest) {
  const userOrError = await requireUser(req)
  if (userOrError instanceof NextResponse) return userOrError

  const mode = req.nextUrl.searchParams.get('mode')

  // Badges + champions (+ tournament ranking) computed once per request, shared
  const badgesPromise = getActiveBadgesAndChampions()

  if (mode === 'tournament') {
    const { badge_map: rawMap, champions, tournament_ranking, tournament_phase_status } = await badgesPromise
    return NextResponse.json({
      ranking: tournament_ranking,
      phase_status: tournament_phase_status,
      badge_map: Object.fromEntries(rawMap),
      champions,
    })
  }

  const stagesParam = req.nextUrl.searchParams.get('stages')
  let stages: string[] | undefined
  if (stagesParam) {
    const parsed = stagesParam.split(',').map((s) => s.trim()).filter((s) => VALID_STAGES.has(s))
    if (parsed.length > 0) stages = parsed
  }

  const [ranking, phase_status, { badge_map: rawMap, champions }] = await Promise.all([
    getRanking(stages),
    stages ? getPhaseStatus(stages) : Promise.resolve(null as PhaseStatus | null),
    badgesPromise,
  ])

  return NextResponse.json({
    ranking,
    phase_status,
    badge_map: Object.fromEntries(rawMap),
    champions,
  })
}
