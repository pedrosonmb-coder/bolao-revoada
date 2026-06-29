import { db } from '@/lib/db'
import { matches } from '@/lib/db/schema'
import { eq, isNotNull, and } from 'drizzle-orm'
import { getPhaseStatus } from '@/lib/notifications/queries'
import { getRanking, getTournamentRanking } from './ranking'
import { getBrazilRanking, isBrazilEliminated } from './ranking-brazil'
import { KNOCKOUT_STAGES } from '@/lib/notifications/phase-champion-block'
import { computeBadgesFromData, computeBadgeMap, computeChampionsMap } from './badges-pure'
import type { BadgeId, ChampionsMap } from './badges-pure'

export type { BadgeId, BadgeEntry, BadgeCriteria, ChampionEntry, ChampionsMap } from './badges-pure'
export { computeBadgesFromData } from './badges-pure'

async function isFinalLocked(): Promise<boolean> {
  const row = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.stage, 'final'), isNotNull(matches.result_locked_at)))
    .limit(1)
    .get()
  return !!row
}

export async function getActiveBadgesAndChampions(): Promise<{
  badge_map: Map<number, BadgeId[]>
  champions: ChampionsMap
  tournament_ranking: import('./ranking').RankingEntry[]
  tournament_phase_status: 'not_started' | 'closed'
}> {
  const [groupStatus, knockoutStatus, finalLocked, brazilEliminated, { ranking: tournamentRanking, phase_status: tournamentStatus }] =
    await Promise.all([
      getPhaseStatus(['group']),
      getPhaseStatus([...KNOCKOUT_STAGES]),
      isFinalLocked(),
      isBrazilEliminated(),
      getTournamentRanking(),
    ])

  const [groupRanking, knockoutRanking, overallRanking, brazilRanking] = await Promise.all([
    groupStatus === 'closed'    ? getRanking(['group'])              : Promise.resolve([]),
    knockoutStatus === 'closed' ? getRanking([...KNOCKOUT_STAGES])  : Promise.resolve([]),
    finalLocked                 ? getRanking()                      : Promise.resolve([]),
    brazilEliminated            ? getBrazilRanking()                : Promise.resolve([]),
  ])

  const badge_map = computeBadgeMap(groupRanking, knockoutRanking, overallRanking, brazilRanking)
  const champions = computeChampionsMap(
    groupStatus, knockoutStatus, finalLocked, brazilEliminated, tournamentStatus,
    groupRanking, knockoutRanking, overallRanking, brazilRanking, tournamentRanking,
  )

  return { badge_map, champions, tournament_ranking: tournamentRanking, tournament_phase_status: tournamentStatus }
}

export async function computeUserBadges(userId: number): Promise<import('./badges-pure').BadgeEntry[]> {
  // Phase 1: check all criteria in parallel (fast COUNT/EXISTS queries)
  const [groupStatus, knockoutStatus, finalLocked, brazilEliminated] = await Promise.all([
    getPhaseStatus(['group']),
    getPhaseStatus([...KNOCKOUT_STAGES]),
    isFinalLocked(),
    isBrazilEliminated(),
  ])

  // Phase 2: only fetch rankings for phases that are actually closed
  const [groupRanking, knockoutRanking, overallRanking, brazilRanking] = await Promise.all([
    groupStatus === 'closed' ? getRanking(['group']) : Promise.resolve([]),
    knockoutStatus === 'closed' ? getRanking([...KNOCKOUT_STAGES]) : Promise.resolve([]),
    finalLocked ? getRanking() : Promise.resolve([]),
    brazilEliminated ? getBrazilRanking() : Promise.resolve([]),
  ])

  return computeBadgesFromData({
    userId,
    groupStatus,
    knockoutStatus,
    finalLocked,
    brazilEliminated,
    groupRanking,
    knockoutRanking,
    overallRanking,
    brazilRanking,
  })
}
