import { db } from '@/lib/db'
import { matches, predictions, users, botMessages } from '@/lib/db/schema'
import { and, eq, gte, lte, isNotNull, isNull, inArray, count } from 'drizzle-orm'
import type { Match, User } from '@/lib/db/schema'
import { filterMatchesWithoutSummary } from './filter-helpers'
export { filterMatchesWithoutSummary }
import { getRanking } from '@/lib/scoring/ranking'
import type { RankingEntry } from '@/lib/scoring/ranking'
import { getDisplayName } from '@/lib/display-name'
import type { PredictionRow } from '@/lib/telegram/messages'

// BRT é sempre UTC-3 (Brasil aboliu horário de verão em 2019)
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000

function toBrtDateString(date: Date): string {
  const brt = new Date(date.getTime() - BRT_OFFSET_MS)
  return brt.toISOString().slice(0, 10) // "YYYY-MM-DD"
}

function brtDayRange(dateStr: string): { start: Date; end: Date } {
  const [year, month, day] = dateStr.split('-').map(Number)
  // BRT 00:00 = UTC 03:00
  const start = new Date(Date.UTC(year, month - 1, day, 3, 0, 0))
  const end = new Date(Date.UTC(year, month - 1, day + 1, 3, 0, 0))
  return { start, end }
}

export function getTodayBrt(): string {
  return toBrtDateString(new Date())
}

export async function getMatchesForDate(brtDateStr: string): Promise<Match[]> {
  const { start, end } = brtDayRange(brtDateStr)
  return db
    .select()
    .from(matches)
    .where(and(gte(matches.kickoff_at, start), lte(matches.kickoff_at, end)))
}

export async function getUpcomingMatches(minutes: number): Promise<Match[]> {
  const now = new Date()
  const cutoff = new Date(Date.now() + minutes * 60 * 1000)
  return db
    .select()
    .from(matches)
    .where(
      and(
        gte(matches.kickoff_at, now),
        lte(matches.kickoff_at, cutoff),
        eq(matches.status, 'scheduled')
      )
    )
}

export function isTopGame(match: Match, totalMatchesToday?: number): boolean {
  if (match.home_team_code === 'BRA' || match.away_team_code === 'BRA') return true
  if (match.stage !== 'group') return true
  if (totalMatchesToday === 1) return true
  return false
}

export async function getUsersWithoutPrediction(matchId: number): Promise<User[]> {
  const activeUsers = await db
    .select()
    .from(users)
    .where(eq(users.is_active, true))

  const existing = await db
    .select({ user_id: predictions.user_id })
    .from(predictions)
    .where(eq(predictions.match_id, matchId))

  const withPrediction = new Set(existing.map((p) => p.user_id))
  return activeUsers.filter((u) => !withPrediction.has(u.id))
}

export async function getRankingTopN(n: number = 3): Promise<RankingEntry[]> {
  const ranking = await getRanking()
  return ranking.slice(0, n)
}

export async function getMatchesFinishedToday(): Promise<Match[]> {
  const today = getTodayBrt()
  const { start, end } = brtDayRange(today)
  return db
    .select()
    .from(matches)
    .where(
      and(
        isNotNull(matches.result_locked_at),
        gte(matches.result_locked_at, start),
        lte(matches.result_locked_at, end)
      )
    )
}

export async function getFinishedTodayButUnlocked(): Promise<Match[]> {
  const today = getTodayBrt()
  const { start, end } = brtDayRange(today)
  return db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, 'finished'),
        isNull(matches.result_locked_at),
        gte(matches.kickoff_at, start),
        lte(matches.kickoff_at, end)
      )
    )
}

export async function getFinishedMatchesAwaitingSummary(): Promise<Match[]> {
  // 24h defensive limit prevents backfilling old results on cold restarts while
  // covering delayed locks (e.g. lock fires 1-2h after kickoff due to API issues).
  // No 60-min window: as long as result_locked_at is set and no post_match_top was
  // sent, the summary will be posted on the next cron run regardless of when it locked.
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const recentlyFinished = await db
    .select()
    .from(matches)
    .where(and(isNotNull(matches.result_locked_at), gte(matches.result_locked_at, since24h)))

  if (recentlyFinished.length === 0) return []

  const matchIds = recentlyFinished.map((m) => m.id)

  const alreadySent = await db
    .select({ match_id: botMessages.match_id })
    .from(botMessages)
    .where(
      and(
        eq(botMessages.type, 'post_match_top'),
        inArray(botMessages.match_id, matchIds)
      )
    )

  const sentMatchIds = new Set(alreadySent.map((r) => r.match_id))
  return filterMatchesWithoutSummary(recentlyFinished, sentMatchIds)
}

export async function getAllMatchesForStage(stage: string): Promise<Match[]> {
  return db.select().from(matches).where(eq(matches.stage, stage))
}

export async function areAllMatchesLockedForStage(stage: string): Promise<boolean> {
  const pending = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.stage, stage), isNull(matches.result_locked_at)))
    .limit(1)
    .get()

  return !pending
}

export type PhaseStatus = 'not_started' | 'in_progress' | 'closed'

export async function getPhaseStatus(stages: string[]): Promise<PhaseStatus> {
  const [totalRows, lockedRows] = await Promise.all([
    db.select({ n: count() }).from(matches).where(inArray(matches.stage, stages)),
    db.select({ n: count() }).from(matches).where(
      and(inArray(matches.stage, stages), isNotNull(matches.result_locked_at))
    ),
  ])
  const total = Number(totalRows[0]?.n ?? 0)
  const locked = Number(lockedRows[0]?.n ?? 0)

  if (total === 0 || locked === 0) return 'not_started'
  if (locked >= total) return 'closed'
  return 'in_progress'
}

// ---------------------------------------------------------------------------
// reveal-predictions queries
// ---------------------------------------------------------------------------

export async function getMatchesToReveal(): Promise<Match[]> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - 15 * 60 * 1000)
  return db
    .select()
    .from(matches)
    .where(
      and(
        lte(matches.predictions_close_at, now),
        gte(matches.predictions_close_at, windowStart),
        inArray(matches.status, ['scheduled', 'live'])
      )
    )
}

export async function getPredictionsForReveal(
  matchId: number
): Promise<{ rows: PredictionRow[]; missing: string[] }> {
  const activeUsers = await db
    .select()
    .from(users)
    .where(eq(users.is_active, true))

  const preds = await db
    .select({
      user_id: predictions.user_id,
      home_score: predictions.home_score,
      away_score: predictions.away_score,
      qualified_team_code: predictions.qualified_team_code,
      created_at: predictions.created_at,
      updated_at: predictions.updated_at,
    })
    .from(predictions)
    .where(eq(predictions.match_id, matchId))

  const predByUser = new Map(preds.map((p) => [p.user_id, p]))

  const rows: PredictionRow[] = activeUsers
    .filter((u) => predByUser.has(u.id))
    .map((u) => {
      const p = predByUser.get(u.id)!
      return {
        name: getDisplayName(u),
        home: p.home_score,
        away: p.away_score,
        qualified: p.qualified_team_code ?? undefined,
        palpited_at: p.updated_at ?? p.created_at,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  const missing = activeUsers
    .filter((u) => !predByUser.has(u.id))
    .map(getDisplayName)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return { rows, missing }
}
