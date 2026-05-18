import { db } from '@/lib/db'
import { matches, predictions, users, botMessages } from '@/lib/db/schema'
import { and, eq, gte, lte, isNotNull, isNull, inArray } from 'drizzle-orm'
import type { Match, User } from '@/lib/db/schema'
import { getRanking } from '@/lib/scoring/ranking'
import type { RankingEntry } from '@/lib/scoring/ranking'

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

export async function getFinishedMatchesAwaitingSummary(
  minutesAgo: number = 60
): Promise<Match[]> {
  const since = new Date(Date.now() - minutesAgo * 60 * 1000)

  const recentlyFinished = await db
    .select()
    .from(matches)
    .where(and(isNotNull(matches.result_locked_at), gte(matches.result_locked_at, since)))

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
  return recentlyFinished.filter((m) => !sentMatchIds.has(m.id))
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
