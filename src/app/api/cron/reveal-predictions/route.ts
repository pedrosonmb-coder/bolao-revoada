import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { getMatchesToReveal, getPredictionsForReveal } from '@/lib/notifications/queries'
import { sendNotification } from '@/lib/notifications/send'
import { predictionsRevealedMessage } from '@/lib/telegram/messages'
import { env } from '@/lib/env'

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const enabled = process.env.REVEAL_PREDICTIONS_ENABLED !== 'false'
  if (!enabled) {
    return NextResponse.json({ skipped: 'disabled' })
  }

  const toReveal = await getMatchesToReveal()

  let revealed = 0
  let skipped = 0
  let errors = 0

  for (const match of toReveal) {
    try {
      const { rows, missing } = await getPredictionsForReveal(match.id)

      if (rows.length === 0) {
        skipped++
        continue
      }

      const text = predictionsRevealedMessage(match, rows, missing)

      const result = await sendNotification({
        type: 'predictions_revealed',
        key: `predictions_revealed:match_${match.id}`,
        chatId: Number(env.TELEGRAM_GROUP_CHAT_ID),
        text,
        matchId: match.id,
        parseMode: 'HTML',
      })

      if (result.sent) {
        revealed++
      } else {
        skipped++
      }
    } catch (err) {
      errors++
      console.error(`[reveal-predictions] match_id=${match.id} error:`, err)
    }
  }

  return NextResponse.json({ matches_checked: toReveal.length, revealed, skipped, errors })
}
