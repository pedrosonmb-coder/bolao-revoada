import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { getMatchesFinishedToday, getFinishedTodayButUnlocked, getRankingTopN } from '@/lib/notifications/queries'
import { sendNotification } from '@/lib/notifications/send'
import { eveningSummaryMessage } from '@/lib/telegram/messages'
import { env } from '@/lib/env'
import { getTodayBrt } from '@/lib/notifications/queries'

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const finishedMatches = await getMatchesFinishedToday()

  if (finishedMatches.length === 0) {
    return NextResponse.json({ sent: false, reason: 'no_finished_matches_today' })
  }

  const pendingLock = await getFinishedTodayButUnlocked()
  if (pendingLock.length > 0) {
    return NextResponse.json({ sent: false, reason: 'awaiting_lock', pending: pendingLock.length })
  }

  const top3 = await getRankingTopN(3)
  const text = eveningSummaryMessage(finishedMatches, top3)
  const today = getTodayBrt()
  const key = `evening_summary:${today}`

  const result = await sendNotification({
    type: 'evening_summary',
    key,
    chatId: Number(env.TELEGRAM_GROUP_CHAT_ID),
    text,
  })

  return NextResponse.json({ ...result, matches_count: finishedMatches.length })
}
