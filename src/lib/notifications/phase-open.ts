import { db } from '@/lib/db'
import { phaseWindows } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Match } from '@/lib/db/schema'
import { areAllMatchesLockedForStage } from './queries'
import { sendNotification } from './send'
import { phaseOpenMessage } from '@/lib/telegram/messages'
import { env } from '@/lib/env'

const NEXT_STAGE: Record<string, string | null> = {
  group: 'r32',
  r32: 'r16',
  r16: 'qf',
  qf: 'sf',
  sf: 'final',
  '3rd': null,
  final: null,
}

export async function checkAndNotifyPhaseOpen(matchJustLocked: Match): Promise<void> {
  const currentStage = matchJustLocked.stage
  const nextStage = NEXT_STAGE[currentStage]

  if (!nextStage) return

  const allLocked = await areAllMatchesLockedForStage(currentStage)
  if (!allLocked) return

  const window = await db
    .select()
    .from(phaseWindows)
    .where(eq(phaseWindows.stage, nextStage))
    .get()

  if (!window) {
    console.log(`[phase-open] nextStage=${nextStage} — sem phase_window cadastrada, pulando notificação`)
    return
  }

  const closesAt = window.closes_at instanceof Date
    ? window.closes_at
    : new Date((window.closes_at as number) * 1000)

  await sendNotification({
    type: 'phase_open',
    key: `phase_open:${nextStage}`,
    chatId: Number(env.TELEGRAM_GROUP_CHAT_ID),
    text: phaseOpenMessage(nextStage, closesAt),
  })

  console.log(`[phase-open] notificação enviada para abertura de ${nextStage}`)
}
