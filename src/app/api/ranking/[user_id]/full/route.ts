import { NextRequest, NextResponse } from 'next/server'
import { eq, and, isNotNull, avg, asc, count, sql, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { predictions, matches, users, rankingSnapshots } from '@/lib/db/schema'
import { requireUser } from '@/lib/server/auth'
import { getUserDetail } from '@/lib/scoring/ranking'
import {
  computeDistribution,
  findBestMatch,
  findWorstMatch,
  computeUserAvg,
  computeGroupAvg,
} from '@/lib/scoring/full-ranking-helpers'
import { computeUserBadges } from '@/lib/scoring/badges'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  const userOrError = await requireUser(req)
  if (userOrError instanceof NextResponse) return userOrError

  const { user_id } = await params
  const userId = Number(user_id)

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'user_id inválido' }, { status: 400 })
  }

  const [detail, predRows, groupAvgRow, snapshotRows, badges, participantRow, closedMatchRow, allClosedMatchRows] = await Promise.all([
    getUserDetail(userId),
    db
      .select({
        match_id: predictions.match_id,
        palpite_home: predictions.home_score,
        palpite_away: predictions.away_score,
        points_awarded: predictions.points_awarded,
        base_points: predictions.base_points,
        stage: matches.stage,
        kickoff_at: matches.kickoff_at,
        home_team_code: matches.home_team_code,
        away_team_code: matches.away_team_code,
        home_score: matches.home_score,
        away_score: matches.away_score,
      })
      .from(predictions)
      .innerJoin(matches, eq(predictions.match_id, matches.id))
      .where(and(eq(predictions.user_id, userId), isNotNull(predictions.computed_at)))
      .orderBy(matches.kickoff_at),
    db
      .select({ group_avg: avg(predictions.points_awarded) })
      .from(predictions)
      .innerJoin(users, eq(predictions.user_id, users.id))
      .where(and(isNotNull(predictions.computed_at), eq(users.is_active, true)))
      .get(),
    db
      .select({
        date: rankingSnapshots.snapshot_date,
        position: rankingSnapshots.position,
        points: rankingSnapshots.total_points,
      })
      .from(rankingSnapshots)
      .where(eq(rankingSnapshots.user_id, userId))
      .orderBy(asc(rankingSnapshots.snapshot_date)),
    computeUserBadges(userId),
    db.select({ total: count() }).from(users).where(eq(users.is_active, true)).get(),
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
    db
      .select({
        match_id: matches.id,
        stage: matches.stage,
        kickoff_at: matches.kickoff_at,
        home_team_code: matches.home_team_code,
        away_team_code: matches.away_team_code,
        home_score: matches.home_score,
        away_score: matches.away_score,
        palpite_home: predictions.home_score,
        palpite_away: predictions.away_score,
        points_awarded: predictions.points_awarded,
        base_points: predictions.base_points,
      })
      .from(matches)
      .leftJoin(
        predictions,
        and(eq(predictions.match_id, matches.id), eq(predictions.user_id, userId))
      )
      .where(lt(matches.predictions_close_at, sql`unixepoch()`))
      .orderBy(asc(matches.kickoff_at)),
  ])

  if (!detail) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const matchesForHelpers = predRows.map((p) => ({
    match_id: p.match_id,
    home_team_code: p.home_team_code,
    away_team_code: p.away_team_code,
    points_awarded: p.points_awarded,
    base_points: p.base_points,
    home_score: p.home_score,
    away_score: p.away_score,
    palpite_home: p.palpite_home,
    palpite_away: p.palpite_away,
  }))

  const distribution = computeDistribution(predRows)
  const best_match = findBestMatch(matchesForHelpers)
  const worst_match = findWorstMatch(matchesForHelpers)
  const user_avg = computeUserAvg(detail.totals.match_points, predRows.length)
  const rawGroupAvg = groupAvgRow?.group_avg
  const group_avg = computeGroupAvg(rawGroupAvg != null ? Number(rawGroupAvg) : null)

  const toISOString = (val: Date | number): string =>
    val instanceof Date ? val.toISOString() : new Date(val * 1000).toISOString()

  return NextResponse.json({
    ...detail,
    matches: allClosedMatchRows.map((p) => ({
      match_id: p.match_id,
      stage: p.stage,
      kickoff_at: toISOString(p.kickoff_at),
      home_team_code: p.home_team_code,
      away_team_code: p.away_team_code,
      home_score: p.home_score,
      away_score: p.away_score,
      palpite_home: p.palpite_home,
      palpite_away: p.palpite_away,
      points_awarded: p.points_awarded,
      base_points: p.base_points,
    })),
    distribution,
    best_match,
    worst_match,
    group_comparison: {
      user_avg_per_match: user_avg,
      group_avg_per_match: group_avg,
    },
    position_history: snapshotRows,
    total_participants: participantRow?.total ?? 0,
    closed_matches: {
      total: closedMatchRow?.closed_total ?? 0,
      missed: closedMatchRow?.missed ?? 0,
    },
    badges,
  })
}
