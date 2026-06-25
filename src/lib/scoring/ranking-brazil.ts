import { db } from '@/lib/db'
import { users, predictions, matches } from '@/lib/db/schema'
import { eq, isNotNull, isNull, and, or, count, desc } from 'drizzle-orm'
import { buildBrazilRankingEntries } from './ranking-brazil-builder'
import { decideBrazilEliminated } from './ranking-brazil-pure'
import type { RankingEntry } from './ranking-phase-builder'

export { buildBrazilRankingEntries } from './ranking-brazil-builder'
export { decideBrazilEliminated } from './ranking-brazil-pure'

export async function isBrazilEliminated(): Promise<boolean> {
  const brazilFilter = or(eq(matches.home_team_code, 'BRA'), eq(matches.away_team_code, 'BRA'))
  const r32TbdFilter = and(
    eq(matches.stage, 'r32'),
    or(eq(matches.home_team_code, 'TBD'), eq(matches.away_team_code, 'TBD')),
  )

  const [brazilRows, r32TbdRows] = await Promise.all([
    db
      .select({
        stage: matches.stage,
        home_team_code: matches.home_team_code,
        away_team_code: matches.away_team_code,
        home_score: matches.home_score,
        away_score: matches.away_score,
        home_score_pen: matches.home_score_pen,
        away_score_pen: matches.away_score_pen,
        result_locked_at: matches.result_locked_at,
      })
      .from(matches)
      .where(brazilFilter)
      .orderBy(desc(matches.kickoff_at)),
    db.select({ n: count() }).from(matches).where(r32TbdFilter).get(),
  ])

  const r32TbdCount = Number(r32TbdRows?.n ?? 0)
  return decideBrazilEliminated(brazilRows, r32TbdCount)
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
