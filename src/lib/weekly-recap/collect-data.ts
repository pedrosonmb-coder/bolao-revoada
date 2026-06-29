import { db } from '@/lib/db'
import { matches, predictions, users } from '@/lib/db/schema'
import { and, eq, gte, lte, isNotNull } from 'drizzle-orm'
import { getRanking } from '@/lib/scoring/ranking'
import { getDisplayName } from '@/lib/display-name'
import type { RecapWindow } from './window'

export type UserSummary = {
  user_id: number
  name: string
}

export type PositionEntry = {
  user_id: number
  name: string
  position: number
  total_points: number
}

export type MoverEntry = {
  user_id: number
  name: string
  positionBefore: number
  positionAfter: number
  delta: number // positivo = subiu, negativo = caiu
}

export type FinishedMatch = {
  id: number
  home_team_name: string
  away_team_name: string
  home_score: number
  away_score: number
  kickoff_at: Date
  stage: string
  venue: string | null
}

export type GuessHighlight = {
  user_id: number
  name: string
  match: {
    home_team_name: string
    away_team_name: string
    home_score: number
    away_score: number
  }
  predicted: { home_score: number; away_score: number }
  points: number
}

export type WorstGuess = {
  user_id: number
  name: string
  match: {
    home_team_name: string
    away_team_name: string
    home_score: number
    away_score: number
  }
  predicted: { home_score: number; away_score: number }
  diff: number
}

export type UpcomingMatch = {
  home_team_name: string
  away_team_name: string
  kickoff_at: Date
  stage: string
  venue: string | null
  city: string | null
}

export type WeeklyRecapData = {
  isoYear: number
  isoWeek: number
  windowStart: Date
  windowEnd: Date
  allUsers: UserSummary[]
  finishedMatches: FinishedMatch[]
  rankingBefore: PositionEntry[]
  rankingAfter: PositionEntry[]
  biggestClimber: MoverEntry | null
  biggestFaller: MoverEntry | null
  bestGuess: GuessHighlight | null
  worstGuess: WorstGuess | null
  upcomingMatches: UpcomingMatch[]
  weeklyPoints: Record<number, number>  // user_id → points earned in this window
}

export async function collectWeeklyRecapData(
  window: RecapWindow,
): Promise<WeeklyRecapData | null> {
  const { startUtc, endUtc, isoYear, isoWeek } = window

  // Jogos finalizados na janela (usa result_locked_at como referência de quando o resultado foi oficial)
  const rawFinished = await db
    .select()
    .from(matches)
    .where(
      and(
        isNotNull(matches.result_locked_at),
        gte(matches.result_locked_at, startUtc),
        lte(matches.result_locked_at, endUtc),
      ),
    )

  // Guard de entrada: sem jogos finalizados → skip
  if (rawFinished.length === 0) return null

  const finishedMatches: FinishedMatch[] = rawFinished.map((m) => ({
    id: m.id,
    home_team_name: m.home_team_name,
    away_team_name: m.away_team_name,
    home_score: m.home_score ?? 0,
    away_score: m.away_score ?? 0,
    kickoff_at: m.kickoff_at instanceof Date ? m.kickoff_at : new Date((m.kickoff_at as number) * 1000),
    stage: m.stage,
    venue: m.venue,
  }))

  // Todos os usuários ativos (para nomes nos prompts)
  const activeUsers = await db
    .select({
      id: users.id,
      first_name: users.first_name,
      last_name: users.last_name,
      previous_position: users.previous_position,
    })
    .from(users)
    .where(eq(users.is_active, true))

  const allUsers: UserSummary[] = activeUsers.map((u) => ({
    user_id: u.id,
    name: getDisplayName(u),
  }))

  // Ranking atual (after)
  const currentRanking = await getRanking()
  const rankingAfter: PositionEntry[] = currentRanking.map((e) => ({
    user_id: e.user_id,
    name: e.name,
    position: e.position,
    total_points: e.total_points,
  }))

  // Ranking anterior: usa previous_position dos usuários (snapshot do início da semana)
  const positionAfterByUser = new Map(rankingAfter.map((e) => [e.user_id, e]))
  const rankingBefore: PositionEntry[] = activeUsers
    .filter((u) => u.previous_position != null)
    .map((u) => ({
      user_id: u.id,
      name: getDisplayName(u),
      position: u.previous_position!,
      total_points: positionAfterByUser.get(u.id)?.total_points ?? 0,
    }))
    .sort((a, b) => a.position - b.position)

  // Maiores movimentos de posição
  const movers: MoverEntry[] = activeUsers
    .filter((u) => u.previous_position != null)
    .map((u) => {
      const after = positionAfterByUser.get(u.id)
      if (!after) return null
      return {
        user_id: u.id,
        name: getDisplayName(u),
        positionBefore: u.previous_position!,
        positionAfter: after.position,
        delta: u.previous_position! - after.position, // positivo = subiu
      }
    })
    .filter((m): m is MoverEntry => m !== null)

  const climbers = movers.filter((m) => m.delta > 0).sort((a, b) => b.delta - a.delta)
  const fallers = movers.filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta)

  const biggestClimber = climbers[0] ?? null
  const biggestFaller = fallers[0] ?? null

  // Palpites da semana — junta predictions com matches pelos IDs dos jogos finalizados
  const finishedMatchIds = rawFinished.map((m) => m.id)
  const matchById = new Map(rawFinished.map((m) => [m.id, m]))
  const userById = new Map(activeUsers.map((u) => [u.id, u]))

  // Busca todos os palpites dos jogos finalizados na janela
  const weekPredictions = await Promise.all(
    finishedMatchIds.map((matchId) =>
      db
        .select()
        .from(predictions)
        .where(and(eq(predictions.match_id, matchId), isNotNull(predictions.computed_at))),
    ),
  ).then((arrays) => arrays.flat())

  // Pontos ganhos na semana por usuário (janela startUtc..endUtc)
  const weeklyPoints: Record<number, number> = {}
  for (const pred of weekPredictions) {
    const pts = pred.points_awarded ?? 0
    weeklyPoints[pred.user_id] = (weeklyPoints[pred.user_id] ?? 0) + pts
  }

  // Melhor palpite: maior points_awarded
  let bestGuess: GuessHighlight | null = null
  let bestPoints = -1

  for (const pred of weekPredictions) {
    const points = pred.points_awarded ?? 0
    if (points > bestPoints) {
      bestPoints = points
      const match = matchById.get(pred.match_id)
      const user = userById.get(pred.user_id)
      if (match && user) {
        bestGuess = {
          user_id: pred.user_id,
          name: getDisplayName(user),
          match: {
            home_team_name: match.home_team_name,
            away_team_name: match.away_team_name,
            home_score: match.home_score ?? 0,
            away_score: match.away_score ?? 0,
          },
          predicted: { home_score: pred.home_score, away_score: pred.away_score },
          points,
        }
      }
    }
  }

  // Pior palpite: pontuou 0, maior diferença absoluta de placar
  let worstGuess: WorstGuess | null = null
  let worstDiff = -1

  for (const pred of weekPredictions) {
    if ((pred.points_awarded ?? 0) !== 0) continue
    const match = matchById.get(pred.match_id)
    const user = userById.get(pred.user_id)
    if (!match || !user) continue

    const diff =
      Math.abs(pred.home_score - (match.home_score ?? 0)) +
      Math.abs(pred.away_score - (match.away_score ?? 0))

    if (diff > worstDiff) {
      worstDiff = diff
      worstGuess = {
        user_id: pred.user_id,
        name: getDisplayName(user),
        match: {
          home_team_name: match.home_team_name,
          away_team_name: match.away_team_name,
          home_score: match.home_score ?? 0,
          away_score: match.away_score ?? 0,
        },
        predicted: { home_score: pred.home_score, away_score: pred.away_score },
        diff,
      }
    }
  }

  // Próximos jogos (até 5, nos próximos 7 dias)
  const sevenDaysFromNow = new Date(endUtc.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingRaw = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, 'scheduled'),
        gte(matches.kickoff_at, endUtc),
        lte(matches.kickoff_at, sevenDaysFromNow),
      ),
    )

  upcomingRaw.sort((a, b) => {
    const aMs = a.kickoff_at instanceof Date ? a.kickoff_at.getTime() : (a.kickoff_at as number) * 1000
    const bMs = b.kickoff_at instanceof Date ? b.kickoff_at.getTime() : (b.kickoff_at as number) * 1000
    return aMs - bMs
  })

  const upcomingMatches: UpcomingMatch[] = upcomingRaw.slice(0, 5).map((m) => ({
    home_team_name: m.home_team_name,
    away_team_name: m.away_team_name,
    kickoff_at: m.kickoff_at instanceof Date ? m.kickoff_at : new Date((m.kickoff_at as number) * 1000),
    stage: m.stage,
    venue: m.venue,
    city: m.city,
  }))

  return {
    isoYear,
    isoWeek,
    windowStart: startUtc,
    windowEnd: endUtc,
    allUsers,
    finishedMatches,
    rankingBefore,
    rankingAfter,
    biggestClimber,
    biggestFaller,
    bestGuess,
    worstGuess,
    upcomingMatches,
    weeklyPoints,
  }
}
