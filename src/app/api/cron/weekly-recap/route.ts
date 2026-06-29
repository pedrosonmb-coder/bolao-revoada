import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { env } from '@/lib/env'
import { getRecapWindow } from '@/lib/weekly-recap/window'
import { collectWeeklyRecapData } from '@/lib/weekly-recap/collect-data'
import { buildRecapMessage } from '@/lib/weekly-recap/build-recap-message'
import { sendNotification } from '@/lib/notifications/send'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const now = new Date()
  const window = getRecapWindow(now)
  const { isoYear, isoWeek } = window
  const lockKey = `weekly-recap:${isoYear}-W${String(isoWeek).padStart(2, '0')}`

  console.log(JSON.stringify({ event: 'weekly_recap_start', isoYear, isoWeek, lockKey }))

  // 1. Coleta dados
  const data = await collectWeeklyRecapData(window)

  if (!data) {
    console.log(JSON.stringify({ event: 'weekly_recap_skip', reason: 'no_finished_matches', isoYear, isoWeek }))
    return NextResponse.json({ skipped: true, reason: 'no_data' })
  }

  if (data.allUsers.length < 3) {
    const count = data.allUsers.length
    console.log(
      JSON.stringify({ event: 'weekly_recap_skip', reason: 'insufficient_participants', count, isoYear, isoWeek }),
    )
    return NextResponse.json({ skipped: true, reason: 'insufficient_participants', count })
  }

  console.log(
    JSON.stringify({
      event: 'weekly_recap_data_collected',
      finished_matches: data.finishedMatches.length,
      upcoming_matches: data.upcomingMatches.length,
      has_climber: !!data.biggestClimber,
      has_faller: !!data.biggestFaller,
    }),
  )

  // 2. Monta mensagem determinística
  const text = buildRecapMessage(data)

  // 3. Envia notificação com lock idempotente
  const sendResult = await sendNotification({
    type: 'weekly_recap',
    key: lockKey,
    chatId: Number(env.TELEGRAM_GROUP_CHAT_ID),
    text,
    payload: { isoYear, isoWeek },
  })

  console.log(
    JSON.stringify({
      event: 'weekly_recap_sent',
      sent: sendResult.sent,
      reason: 'reason' in sendResult ? sendResult.reason : undefined,
      isoYear,
      isoWeek,
    }),
  )

  return NextResponse.json({
    ok: true,
    isoWeek,
    sent: sendResult.sent,
  })
}
