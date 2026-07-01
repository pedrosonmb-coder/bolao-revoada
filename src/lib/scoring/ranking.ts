import { db } from '@/lib/db'
import { users, predictions, tournamentPredictions, matches } from '@/lib/db/schema'
import { eq, isNotNull, and, lt, sql, count } from 'drizzle-orm'
import type { Match } from '@/lib/db/schema'
import { getDisplayName } from '@/lib/display-name'
import { buildPhaseRankingEntries } from './ranking-phase-builder'
import {
  buildTournamentRankingEntries,
  getTournamentPhaseStatus,
} from './ranking-tournament-builder'

// RankingEntry is canonical in ranking-phase-builder; re-exported here for
// backward compat (all existing importers use '@/lib/scoring/ranking').
export type { RankingEntry } from './ranking-phase-builder'
import type { RankingEntry } from './ranking-phase-builder'

export async function getRanking(stages?: string[]): Promise<RankingEntry[]> {
  const activeUsers = await db
    .select()
    .from(users)
    .where(eq(users.is_active, true))

  if (stages) {
    const [allPredictions, allMatchRows] = await Promise.all([
      db.select().from(predictions).where(isNotNull(predictions.computed_at)),
      db.select({ id: matches.id, stage: matches.stage }).from(matches),
    ])
    const matchStageById = new Map(allMatchRows.map((m) => [m.id, m.stage]))
    return buildPhaseRankingEntries(activeUsers, allPredictions, matchStageById, stages)
  }

  // Global ranking — behavior identical to before
  const [allPredictions, allTournamentPreds] = await Promise.all([
    db.select().from(predictions).where(isNotNull(predictions.computed_at)),
    db.select().from(tournamentPredictions),
  ])

  const tournamentByUser = new Map(
    allTournamentPreds.map((tp) => [tp.user_id, tp.points_awarded ?? 0])
  )

  const predsByUser = new Map<number, typeof allPredictions>()
  for (const p of allPredictions) {
    const list = predsByUser.get(p.user_id) ?? []
    list.push(p)
    predsByUser.set(p.user_id, list)
  }

  // Oldest prediction per user (for tie-breaking)
  const allForTiebreak = await db.select().from(predictions)
  const oldestByUser = new Map<number, Date>()
  for (const p of allForTiebreak) {
    const existing = oldestByUser.get(p.user_id)
    const createdAt = p.created_at instanceof Date ? p.created_at : new Date((p.created_at as number) * 1000)
    if (!existing || createdAt < existing) {
      oldestByUser.set(p.user_id, createdAt)
    }
  }

  const entries = activeUsers.map((u) => {
    const preds = predsByUser.get(u.id) ?? []
    const match_points = preds.reduce((acc, p) => acc + (p.points_awarded ?? 0), 0)
    const tournament_points = tournamentByUser.get(u.id) ?? 0
    const total_points = match_points + tournament_points
    const exact_scores = preds.filter((p) => p.base_points === 25).length
    const winners_correct = preds.filter((p) => (p.base_points ?? 0) >= 10).length

    return {
      user_id: u.id,
      telegram_id: u.telegram_id,
      name: getDisplayName(u),
      photo_url: u.photo_url,
      total_points,
      match_points,
      tournament_points,
      exact_scores,
      winners_correct,
      position: 0,
      prev_position: u.previous_position ?? null,
    }
  })

  // Sort with tie-breaking per spec 4.8
  entries.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    if (b.winners_correct !== a.winners_correct) return b.winners_correct - a.winners_correct
    if (b.exact_scores !== a.exact_scores) return b.exact_scores - a.exact_scores
    if (b.tournament_points !== a.tournament_points) return b.tournament_points - a.tournament_points
    const aOldest = oldestByUser.get(a.user_id)?.getTime() ?? Infinity
    const bOldest = oldestByUser.get(b.user_id)?.getTime() ?? Infinity
    if (aOldest !== bOldest) return aOldest - bOldest
    // Último critério: deterministicamente por telegram_id
    return a.telegram_id - b.telegram_id
  })

  // Assign positions (same position for true ties after all criteria)
  let pos = 1
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) {
      const prev = entries[i - 1]
      const curr = entries[i]
      const isTrueTie =
        prev.total_points === curr.total_points &&
        prev.winners_correct === curr.winners_correct &&
        prev.exact_scores === curr.exact_scores &&
        prev.tournament_points === curr.tournament_points
      if (!isTrueTie) pos = i + 1
    }
    entries[i].position = pos
  }

  return entries
}

export async function getTournamentRanking(): Promise<{
  ranking: RankingEntry[]
  phase_status: 'not_started' | 'closed'
}> {
  const [activeUsers, preds] = await Promise.all([
    db.select().from(users).where(eq(users.is_active, true)),
    db
      .select({
        user_id: tournamentPredictions.user_id,
        points_awarded: tournamentPredictions.points_awarded,
        closed_at: tournamentPredictions.closed_at,
        computed_at: tournamentPredictions.computed_at,
      })
      .from(tournamentPredictions),
  ])

  return {
    ranking: buildTournamentRankingEntries(activeUsers, preds),
    phase_status: getTournamentPhaseStatus(preds),
  }
}

export type UserDetail = {
  user: { name: string; photo_url: string | null; telegram_id: number }
  totals: { total_points: number; match_points: number; tournament_points: number; position: number }
  by_stage: { stage: string; points: number; matches_played: number; accuracy: number }[]
  achievements: { exact_scores: number; winners_correct: number }
  closed_matches: { total: number; missed: number }
}

export async function getUserDetail(userId: number): Promise<UserDetail | null> {
  const user = await db.select().from(users).where(eq(users.id, userId)).get()
  if (!user) return null

  const ranking = await getRanking()
  const entry = ranking.find((e) => e.user_id === userId)
  if (!entry) return null

  const [userPreds, allMatches, closedMatchRow] = await Promise.all([
    db
      .select()
      .from(predictions)
      .where(and(eq(predictions.user_id, userId), isNotNull(predictions.computed_at))),
    db.select().from(matches),
    db
      .select({
        closed_total: count(),
        missed: sql<number>`COUNT(CASE WHEN ${predictions.id} IS NULL THEN 1 END)`,
      })
      .from(matches)
      .leftJoin(
        predictions,
        and(eq(predictions.match_id, matches.id), eq(predictions.user_id, userId))
      )
      .where(lt(matches.predictions_close_at, sql`unixepoch()`))
      .get(),
  ])

  const matchById = new Map(allMatches.map((m: Match) => [m.id, m]))

  const byStage = new Map<string, { points: number; matches_played: number; correct: number }>()
  for (const p of userPreds) {
    const match = matchById.get(p.match_id)
    if (!match) continue
    const stage = match.stage
    const existing = byStage.get(stage) ?? { points: 0, matches_played: 0, correct: 0 }
    existing.points += p.points_awarded ?? 0
    existing.matches_played += 1
    if ((p.base_points ?? 0) >= 10) existing.correct += 1
    byStage.set(stage, existing)
  }

  const stageOrder = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']
  const by_stage = stageOrder
    .filter((s) => byStage.has(s))
    .map((s) => {
      const data = byStage.get(s)!
      return {
        stage: s,
        points: data.points,
        matches_played: data.matches_played,
        accuracy: data.matches_played > 0 ? data.correct / data.matches_played : 0,
      }
    })

  return {
    user: {
      name: getDisplayName(user),
      photo_url: user.photo_url,
      telegram_id: user.telegram_id,
    },
    totals: {
      total_points: entry.total_points,
      match_points: entry.match_points,
      tournament_points: entry.tournament_points,
      position: entry.position,
    },
    by_stage,
    achievements: {
      exact_scores: entry.exact_scores,
      winners_correct: entry.winners_correct,
    },
    closed_matches: {
      total: closedMatchRow?.closed_total ?? 0,
      missed: closedMatchRow?.missed ?? 0,
    },
  }
}
