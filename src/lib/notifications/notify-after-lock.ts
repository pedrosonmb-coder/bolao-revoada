import type { Match } from '@/lib/db/schema'
import { checkAndNotifyPhaseOpen } from './phase-open'
import { checkAndNotifyPhaseChampion } from './phase-champion'
import { alertAdminPenaltyCheck, alertAdminMissingQualifier, alertAdminLockReview } from './admin-alert'

// Ponto único de notificações pós-lock. Todos os caminhos (reconciliação, override,
// cancel) devem chamar esta função para garantir consistência.
// Cada sub-notificação é best-effort: falha não derruba o lock.
// alertAdminPenaltyCheck só dispara se houver placar de pênaltis (home_score_pen != null).
// Em jogos cancelados (W.O.) home_score_pen é sempre null, então o check não dispara.
// alertAdminLockReview dispara para mata-mata (sem pênaltis) ou qualquer jogo com regressão suspeita.
// Sem duplicata: jogo de mata-mata com pênaltis já tem penalty_check — lock_review não dispara nesses.
export async function notifyAfterLock(
  match: Match,
  options?: { peakScore?: { home: number; away: number } | null }
): Promise<void> {
  checkAndNotifyPhaseOpen(match).catch((err) =>
    console.error(`[notify-after-lock] phase-open error for match ${match.id}:`, err)
  )
  checkAndNotifyPhaseChampion(match).catch((err) =>
    console.error(`[notify-after-lock] phase-champion error for match ${match.id}:`, err)
  )

  const hasPenalties = match.home_score_pen !== null
  if (hasPenalties) {
    alertAdminPenaltyCheck(match).catch((err) =>
      console.error(`[notify-after-lock] penalty-check error for match ${match.id}:`, err)
    )
  }

  if (
    match.stage !== 'group' &&
    match.home_score !== null &&
    match.away_score !== null &&
    match.home_score === match.away_score &&
    match.qualified_team_code === null &&
    match.status !== 'cancelled'
  ) {
    alertAdminMissingQualifier(match).catch((err) =>
      console.error(`[notify-after-lock] missing-qualifier error for match ${match.id}:`, err)
    )
  }

  const peakScore = options?.peakScore ?? null
  const regressionSuspected =
    peakScore !== null &&
    match.home_score !== null &&
    match.away_score !== null &&
    (match.home_score < peakScore.home || match.away_score < peakScore.away)

  const isKnockout = match.stage !== 'group'
  // Mata-mata com pênaltis já gera penalty_check (mais específico). Não duplicar com lock_review.
  const shouldAlertLockReview = (isKnockout && !hasPenalties) || regressionSuspected

  if (shouldAlertLockReview) {
    alertAdminLockReview(match, { regressionSuspected, peakScore: peakScore ?? undefined }).catch((err) =>
      console.error(`[notify-after-lock] lock-review error for match ${match.id}:`, err)
    )
  }
}
