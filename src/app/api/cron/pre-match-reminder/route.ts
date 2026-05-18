import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import {
  getUpcomingMatches,
  isTopGame,
  getUsersWithoutPrediction,
  getMatchesForDate,
  getTodayBrt,
} from '@/lib/notifications/queries'
import { sendNotification } from '@/lib/notifications/send'
import { preMatchTopMessage, preMatchDmMessage } from '@/lib/telegram/messages'
import { env } from '@/lib/env'

// Janela: jogos entre 25 e 35 min à frente (evita re-notificar em ciclos consecutivos)
const WINDOW_MIN = 25
const WINDOW_MAX = 35

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const upcoming = await getUpcomingMatches(WINDOW_MAX)
  const now = Date.now()

  const inWindow = upcoming.filter((m) => {
    const kickoff = m.kickoff_at instanceof Date
      ? m.kickoff_at.getTime()
      : (m.kickoff_at as number) * 1000
    const diffMin = (kickoff - now) / 60000
    return diffMin >= WINDOW_MIN && diffMin <= WINDOW_MAX
  })

  const todayStr = getTodayBrt()
  const todayMatches = await getMatchesForDate(todayStr)
  const totalToday = todayMatches.length

  let top_notified = 0
  let dm_sent = 0
  let dm_skipped = 0

  for (const match of inWindow) {
    const usersWithout = await getUsersWithoutPrediction(match.id)

    if (isTopGame(match, totalToday)) {
      const result = await sendNotification({
        type: 'pre_match_top',
        key: `pre_match_top:match_${match.id}`,
        chatId: Number(env.TELEGRAM_GROUP_CHAT_ID),
        text: preMatchTopMessage(match, usersWithout),
        matchId: match.id,
      })
      if (result.sent) top_notified++
    }

    for (const user of usersWithout) {
      const result = await sendNotification({
        type: 'pre_match_dm',
        key: `pre_match_dm:match_${match.id}:user_${user.id}`,
        chatId: user.telegram_id,
        text: preMatchDmMessage(match, env.NEXT_PUBLIC_APP_URL),
        matchId: match.id,
      })
      if (result.sent) {
        dm_sent++
      } else {
        dm_skipped++
      }
    }
  }

  return NextResponse.json({
    matches_processed: inWindow.length,
    top_notified,
    dm_sent,
    dm_skipped,
  })
}
