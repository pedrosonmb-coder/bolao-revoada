import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { getMatchesForDate, getUsersWithoutPrediction, getTodayBrt } from '@/lib/notifications/queries'
import { sendNotification } from '@/lib/notifications/send'
import { morningDigestMessage } from '@/lib/telegram/messages'
import { env } from '@/lib/env'

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const today = getTodayBrt()
  const todayMatches = await getMatchesForDate(today)

  if (todayMatches.length === 0) {
    return NextResponse.json({ sent: false, reason: 'no_matches_today' })
  }

  const usersWithoutByMatch = await Promise.all(
    todayMatches.map(async (m) => ({
      match_id: m.id,
      users: await getUsersWithoutPrediction(m.id),
    }))
  )

  const text = morningDigestMessage(todayMatches, usersWithoutByMatch)
  const key = `morning_digest:${today}`

  const result = await sendNotification({
    type: 'morning_digest',
    key,
    chatId: Number(env.TELEGRAM_GROUP_CHAT_ID),
    text,
  })

  const mentions = usersWithoutByMatch.reduce((acc, x) => acc + x.users.length, 0)

  return NextResponse.json({
    ...result,
    matches_count: todayMatches.length,
    mentions_count: mentions,
  })
}
