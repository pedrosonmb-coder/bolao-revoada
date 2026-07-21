import type { Match } from '@/lib/db/schema'
import { db } from '@/lib/db'
import { tournamentPredictions, matches } from '@/lib/db/schema'
import { isNotNull, and, eq } from 'drizzle-orm'
import { getPhaseStatus } from './queries'
import { sendNotification } from './send'
import { phaseChampionMessage, overallChampionMessage } from '@/lib/telegram/messages'
import { getRanking } from '@/lib/scoring/ranking'
import { env } from '@/lib/env'
import { resolveChampionBlock, KNOCKOUT_STAGES } from './phase-champion-block'
import { alertAdminTournamentRequired } from './admin-alert'

export { resolveChampionBlock } from './phase-champion-block'

async function isTournamentComputed(): Promise<boolean> {
  const row = await db
    .select({ id: tournamentPredictions.id })
    .from(tournamentPredictions)
    .where(isNotNull(tournamentPredictions.computed_at))
    .limit(1)
    .get()
  return !!row
}

async function isFinalLocked(): Promise<boolean> {
  const row = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.stage, 'final'), isNotNull(matches.result_locked_at)))
    .limit(1)
    .get()
  return !!row
}

export async function checkAndNotifyPhaseChampion(matchJustLocked: Match): Promise<void> {
  const block = resolveChampionBlock(matchJustLocked.stage)
  if (!block) return

  // Group block: announce group phase champion (match points only)
  if (block === 'group') {
    const status = await getPhaseStatus(['group'])
    if (status !== 'closed') return

    const ranking = await getRanking(['group'])
    const champions = ranking.filter((e) => e.position === 1)
    if (champions.length === 0) return

    const names = champions.map((c) => c.name)
    const points = champions[0].total_points

    await sendNotification({
      type: 'phase_champion',
      key: 'phase_champion:group',
      chatId: Number(env.TELEGRAM_GROUP_CHAT_ID),
      text: phaseChampionMessage('group', names, points),
    })
    console.log(`[phase-champion] grupos encerrados — campeão: ${names.join(' e ')} (${points} pts)`)
    return
  }

  // Knockout block: announce the Overall Bolão Champion (match + tournament points).
  // Requires all knockout stages (including 3rd) to be closed AND the tournament to be
  // computed. If tournament isn't computed yet, suppress and alert admin to fill it first.
  const stages = [...KNOCKOUT_STAGES]
  const status = await getPhaseStatus(stages)
  if (status !== 'closed') return

  const tournamentReady = await isTournamentComputed()
  if (!tournamentReady) {
    // Defer: alert admin to fill tournament results and recalculate.
    // maybeAnnounceOverallChampion() will fire automatically after recalculate runs.
    alertAdminTournamentRequired(matchJustLocked).catch((err) =>
      console.error(`[phase-champion] tournament-required alert error for match ${matchJustLocked.id}:`, err)
    )
    console.log(
      JSON.stringify({ event: 'overall_champion_deferred', match_id: matchJustLocked.id, reason: 'tournament_not_computed' })
    )
    return
  }

  await sendOverallChampionAnnouncement()
}

/**
 * Fires the overall champion announcement if: final is locked, all knockout stages closed,
 * tournament computed, and announcement hasn't been sent yet.
 * Called from the admin recalculate route after a successful tournament recalculate.
 */
export async function maybeAnnounceOverallChampion(): Promise<void> {
  const finalLocked = await isFinalLocked()
  if (!finalLocked) return

  const status = await getPhaseStatus([...KNOCKOUT_STAGES])
  if (status !== 'closed') return

  const tournamentReady = await isTournamentComputed()
  if (!tournamentReady) return

  await sendOverallChampionAnnouncement()
}

async function sendOverallChampionAnnouncement(): Promise<void> {
  const ranking = await getRanking() // overall: match + tournament points
  const champions = ranking.filter((e) => e.position === 1)
  if (champions.length === 0) return

  // Posições de pódio (1º, 2º, 3º) — agrupa nomes empatados na mesma posição.
  // Se houver empate no 1º lugar, o próximo lugar real é o 3º (getRanking pula a
  // posição 2), então o pódio pode sair com só 2 linhas — comportamento esperado.
  const podium = [1, 2, 3]
    .map((pos) => ranking.filter((e) => e.position === pos))
    .filter((entries) => entries.length > 0)
    .map((entries) => ({ names: entries.map((e) => e.name), points: entries[0].total_points }))

  await sendNotification({
    type: 'phase_champion',
    key: 'phase_champion:overall',
    chatId: Number(env.TELEGRAM_GROUP_CHAT_ID),
    text: overallChampionMessage(podium, ranking.length),
  })
  console.log(`[phase-champion] Campeão Geral: ${champions.map((c) => c.name).join(' e ')} (${champions[0].total_points} pts)`)
}
