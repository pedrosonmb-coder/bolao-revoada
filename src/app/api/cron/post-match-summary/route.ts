import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { getFinishedMatchesAwaitingSummary, isTopGame, getRankingTopN } from '@/lib/notifications/queries'
import { sendNotification } from '@/lib/notifications/send'
import { postMatchTopMessage } from '@/lib/telegram/messages'
import { env } from '@/lib/env'

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const finished = await getFinishedMatchesAwaitingSummary()
  const topGames = finished.filter((m) => isTopGame(m))

  let sent = 0

  for (const match of topGames) {
    const top3 = await getRankingTopN(3)
    const result = await sendNotification({
      type: 'post_match_top',
      key: `post_match_top:match_${match.id}`,
      chatId: Number(env.TELEGRAM_GROUP_CHAT_ID),
      text: postMatchTopMessage(match, top3),
      matchId: match.id,
    })
    if (result.sent) sent++
  }

  return NextResponse.json({ checked: finished.length, sent })
}
