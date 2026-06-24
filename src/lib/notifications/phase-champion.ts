import type { Match } from '@/lib/db/schema'
import { getPhaseStatus } from './queries'
import { sendNotification } from './send'
import { phaseChampionMessage } from '@/lib/telegram/messages'
import { getRanking } from '@/lib/scoring/ranking'
import { env } from '@/lib/env'
import { resolveChampionBlock, KNOCKOUT_STAGES } from './phase-champion-block'

export { resolveChampionBlock } from './phase-champion-block'

export async function checkAndNotifyPhaseChampion(matchJustLocked: Match): Promise<void> {
  const block = resolveChampionBlock(matchJustLocked.stage)
  if (!block) return

  const stages = block === 'group' ? ['group'] : [...KNOCKOUT_STAGES]

  // Only announce when the ENTIRE block is closed
  const status = await getPhaseStatus(stages)
  if (status !== 'closed') return

  // Compute ranking for the block to find champion(s)
  const ranking = await getRanking(stages)
  const champions = ranking.filter((e) => e.position === 1)
  if (champions.length === 0) return

  const names = champions.map((c) => c.name)
  const points = champions[0].total_points

  await sendNotification({
    type: 'phase_champion',
    key: `phase_champion:${block}`,
    chatId: Number(env.TELEGRAM_GROUP_CHAT_ID),
    text: phaseChampionMessage(block, names, points),
  })

  console.log(
    `[phase-champion] ${block} encerrado — campeão: ${names.join(' e ')} (${points} pts)`
  )
}
