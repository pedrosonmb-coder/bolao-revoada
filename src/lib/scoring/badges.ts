import { db } from '@/lib/db'
import { matches } from '@/lib/db/schema'
import { eq, isNotNull, and } from 'drizzle-orm'
import { getPhaseStatus } from '@/lib/notifications/queries'
import { getRanking } from './ranking'
import { getBrazilRanking, isBrazilEliminated } from './ranking-brazil'
import { KNOCKOUT_STAGES } from '@/lib/notifications/phase-champion-block'
import { computeBadgesFromData } from './badges-pure'

export type { BadgeId, BadgeEntry, BadgeCriteria } from './badges-pure'
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
