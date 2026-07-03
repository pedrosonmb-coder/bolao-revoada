import type { Match } from '@/lib/db/schema'
import { checkAndNotifyPhaseOpen } from './phase-open'
import { checkAndNotifyPhaseChampion } from './phase-champion'
import { alertAdminPenaltyCheck } from './admin-alert'

// Ponto único de notificações pós-lock. Todos os caminhos (reconciliação, override,
// cancel) devem chamar esta função para garantir consistência.
// Cada sub-notificação é best-effort: falha não derruba o lock.
// alertAdminPenaltyCheck só dispara se houver placar de pênaltis (home_score_pen != null).
// Em jogos cancelados (W.O.) home_score_pen é sempre null, então o check não dispara.
export async function notifyAfterLock(match: Match): Promise<void> {
  checkAndNotifyPhaseOpen(match).catch((err) =>
    console.error(`[notify-after-lock] phase-open error for match ${match.id}:`, err)
  )
  checkAndNotifyPhaseChampion(match).catch((err) =>
    console.error(`[notify-after-lock] phase-champion error for match ${match.id}:`, err)
  )
  if (match.home_score_pen !== null) {
    alertAdminPenaltyCheck(match).catch((err) =>
      console.error(`[notify-after-lock] penalty-check error for match ${match.id}:`, err)
    )
  }
}
