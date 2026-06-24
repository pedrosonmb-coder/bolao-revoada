import { db } from '@/lib/db'
import { users, predictions, matches } from '@/lib/db/schema'
import { eq, isNotNull, isNull, and, or, count } from 'drizzle-orm'
import { buildBrazilRankingEntries } from './ranking-brazil-builder'
import type { RankingEntry } from './ranking-phase-builder'

export { buildBrazilRankingEntries } from './ranking-brazil-builder'

export async function isBrazilEliminated(): Promise<boolean> {
  const brazilFilter = or(eq(matches.home_team_code, 'BRA'), eq(matches.away_team_code, 'BRA'))
  const [totalRows, unlockedRows] = await Promise.all([
    db.select({ n: count() }).from(matches).where(brazilFilter),
    db
      .select({ n: count() })
      .from(matches)
      .where(and(brazilFilter, isNull(matches.result_locked_at))),
  ])
  const total = Number(totalRows[0]?.n ?? 0)
  const unlocked = Number(unlockedRows[0]?.n ?? 0)
  return total > 0 && unlocked === 0
}

export async function getBrazilRanking(): Promise<RankingEntry[]> {
  const [activeUsers, brazilMatches, allPredictions] = await Promise.all([
    db.select().from(users).where(eq(users.is_active, true)),
    db
      .select({ id: matches.id })
      .from(matches)
      .where(or(eq(matches.home_team_code, 'BRA'), eq(matches.away_team_code, 'BRA'))),
    db.select().from(predictions).where(isNotNull(predictions.computed_at)),
  ])

  const brazilMatchIds = new Set(brazilMatches.map((m) => m.id))
  return buildBrazilRankingEntries(activeUsers, allPredictions, brazilMatchIds)
}
