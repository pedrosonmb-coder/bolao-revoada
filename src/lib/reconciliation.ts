import { db } from '@/lib/db'
import { matches, matchSnapshots } from '@/lib/db/schema'
import { eq, desc, sql, and, isNotNull } from 'drizzle-orm'
import type { Match } from '@/lib/db/schema'
import { fetchMatchFromFootballData } from './data-sources/football-data'
import { fetchMatchFromFifa } from './data-sources/fifa'
import { fetchMatchFromGE } from './data-sources/ge'
import { fetchMatchFromWikipedia } from './data-sources/wikipedia'
import type { MatchSnapshot } from './data-sources/types'
import { isPlausibleSnapshot, selectConsensusSnapshots } from './data-sources/validate'
import { recalculateMatchPredictions } from './scoring/recalculate-match-predictions'
import { retryRecalculate } from './recalculate-retry'
import { checkAndNotifyPhaseOpen } from './notifications/phase-open'
import { checkAndNotifyPhaseChampion } from './notifications/phase-champion'
import { alertAdminConflict } from './notifications/admin-alert'
import { computeLockDecision, LOCK_THRESHOLD } from './reconciliation-lock'
import { deriveQualifiedTeamCode } from './scoring/derive-qualified'
export { computeLockDecision } from './reconciliation-lock'
export type { LockDecision } from './reconciliation-lock'

const CONFLICT_ALERT_THRESHOLD = 5

export type ReconciliationResult =
  | { kind: 'agreed'; snapshot: MatchSnapshot; agreeing_sources: string[] }
  | { kind: 'partial'; snapshot: MatchSnapshot; only_source: string }
  | { kind: 'conflict'; snapshots: MatchSnapshot[]; reason: string }
  | { kind: 'all_failed'; reason: string }

function snapshotsAgree(a: MatchSnapshot, b: MatchSnapshot): boolean {
  return (
    a.home_score === b.home_score &&
    a.away_score === b.away_score &&
    a.status === b.status
  )
}

function findConsensus(
  snapshots: MatchSnapshot[]
): { snapshot: MatchSnapshot; sources: string[] } | null {
  for (let i = 0; i < snapshots.length; i++) {
    const agreeing = snapshots.filter((s) => snapshotsAgree(s, snapshots[i]))
    if (agreeing.length >= 2) {
      return {
        snapshot: snapshots[i],
        sources: agreeing.map((s) => s.source),
      }
    }
  }
  return null
}

async function saveSnapshot(matchId: number, s: MatchSnapshot): Promise<void> {
  await db.insert(matchSnapshots).values({
    match_id: matchId,
    source: s.source,
    status: s.status,
    home_score: s.home_score,
    away_score: s.away_score,
    home_score_pen: s.home_score_pen,
    away_score_pen: s.away_score_pen,
    raw_payload: JSON.stringify(s.raw_payload),
    fetched_at: s.fetched_at,
  })
}

export async function reconcileMatch(match: Match): Promise<ReconciliationResult> {
  // Fase 1: football-data + fifa em paralelo
  const [fdSnapshot, fifaSnapshot] = await Promise.all([
    match.fd_id ? fetchMatchFromFootballData(match.fd_id) : Promise.resolve(null),
    match.fifa_id ? fetchMatchFromFifa(match.fifa_id) : Promise.resolve(null),
  ])

  const phase1: MatchSnapshot[] = [fdSnapshot, fifaSnapshot].filter(
    (s): s is MatchSnapshot => s !== null && isPlausibleSnapshot(s)
  )

  // Persiste snapshots da fase 1
  await Promise.all(phase1.map((s) => saveSnapshot(match.id, s)))

  const consensus1 = findConsensus(phase1)
  if (consensus1) {
    return {
      kind: 'agreed',
      snapshot: consensus1.snapshot,
      agreeing_sources: consensus1.sources,
    }
  }

  // Fase 2: busca ge + wikipedia como desempate
  const kickoff = match.kickoff_at instanceof Date
    ? match.kickoff_at
    : new Date((match.kickoff_at as number) * 1000)

  const [geSnapshot, wikiSnapshot] = await Promise.all([
    fetchMatchFromGE(match.home_team_code, match.away_team_code, kickoff),
    fetchMatchFromWikipedia(match.home_team_code, match.away_team_code, kickoff),
  ])

  // Only save plausible phase 2 snapshots — implausible scores (e.g. Wikipedia regex
  // returning "2025-8") must not reach match_snapshots, or the lock query (IS NOT NULL)
  // would see the bad score and block locking. Log before discarding for observability.
  const phase2Plausible: MatchSnapshot[] = []
  for (const s of [geSnapshot, wikiSnapshot]) {
    if (s === null) continue
    if (!isPlausibleSnapshot(s)) {
      console.warn(`[reconciliation] snapshot implausivel descartado de ${s.source} para match ${match.id}: ${s.home_score}-${s.away_score}`)
      continue
    }
    phase2Plausible.push(s)
  }
  await Promise.all(phase2Plausible.map((s) => saveSnapshot(match.id, s)))

  // Wikipedia is last resort: only enters consensus when no structured source responded.
  // Prevents a bad Wikipedia regex match (e.g. 2025-8 from USA×PAR on 2026-06-13) from
  // causing a multi-hour conflict against a stable football-data result.
  const all = selectConsensusSnapshots({ phase1Snapshots: phase1, geSnapshot, wikiSnapshot })

  if (all.length === 0) {
    return { kind: 'all_failed', reason: 'Nenhuma fonte respondeu' }
  }

  const consensus2 = findConsensus(all)
  if (consensus2) {
    return {
      kind: 'agreed',
      snapshot: consensus2.snapshot,
      agreeing_sources: consensus2.sources,
    }
  }

  if (all.length === 1) {
    return { kind: 'partial', snapshot: all[0], only_source: all[0].source }
  }

  return {
    kind: 'conflict',
    snapshots: all,
    reason: `${all.length} fontes responderam mas divergem`,
  }
}

export async function applyReconciliation(
  matchId: number,
  result: ReconciliationResult
): Promise<{ updated: boolean; locked: boolean }> {
  if (result.kind === 'all_failed') {
    return { updated: false, locked: false }
  }

  if (result.kind === 'conflict') {
    // Incrementa contador de conflitos e alerta admin se ultrapassar o limiar
    const [updated] = await db
      .update(matches)
      .set({ disagreement_count: sql`${matches.disagreement_count} + 1` })
      .where(eq(matches.id, matchId))
      .returning({ disagreement_count: matches.disagreement_count })

    if (updated && updated.disagreement_count >= CONFLICT_ALERT_THRESHOLD) {
      const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1)
      if (match) {
        alertAdminConflict(match, result.snapshots).catch((err) =>
          console.error(`[reconciliation] falha ao alertar admin para match ${matchId}:`, err)
        )
      }
    }

    return { updated: false, locked: false }
  }

  const snapshot = result.snapshot

  // Busca estado atual para idempotência
  const [current] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1)

  if (!current) return { updated: false, locked: false }

  // Já está locked — não sobrescreve
  if (current.result_locked_at) return { updated: false, locked: false }

  // Never overwrite a known score with null — the API can transiently return null
  // for finished matches before the official scoresheet is confirmed.
  const effectiveHomeScore = snapshot.home_score !== null ? snapshot.home_score : current.home_score
  const effectiveAwayScore = snapshot.away_score !== null ? snapshot.away_score : current.away_score

  const sameAsStored =
    current.home_score === effectiveHomeScore &&
    current.away_score === effectiveAwayScore &&
    current.status === snapshot.status

  if (!sameAsStored) {
    await db
      .update(matches)
      .set({
        home_score: effectiveHomeScore,
        away_score: effectiveAwayScore,
        home_score_pen: snapshot.home_score_pen,
        away_score_pen: snapshot.away_score_pen,
        status: snapshot.status ?? current.status,
      })
      .where(eq(matches.id, matchId))
  }

  // Lock check: use only non-null snapshots so halftime/transient nulls don't
  // reset the stable final score or inflate the agreement count.
  // No score-range filter needed here — implausible scores are rejected at write time
  // (isPlausibleSnapshot above), so the DB only contains plausible values.
  let locked = false
  const recentNonNull = await db
    .select({ home_score: matchSnapshots.home_score, away_score: matchSnapshots.away_score, status: matchSnapshots.status })
    .from(matchSnapshots)
    .where(
      and(
        eq(matchSnapshots.match_id, matchId),
        isNotNull(matchSnapshots.home_score),
        isNotNull(matchSnapshots.away_score)
      )
    )
    .orderBy(desc(matchSnapshots.fetched_at))
    .limit(LOCK_THRESHOLD)

  const decision = computeLockDecision({
    snapshotStatus: snapshot.status,
    resultKind: result.kind,
    recentNonNullSnapshots: recentNonNull.map((s) => ({
      home_score: s.home_score!,
      away_score: s.away_score!,
      status: s.status,
    })),
  })

  if (decision.shouldLock) {
    // FURO 1: deriva o classificado automaticamente ao travar o resultado
    const qualifiedTeamCode = deriveQualifiedTeamCode(
      decision.lockScore.home,
      decision.lockScore.away,
      snapshot.home_score_pen,
      snapshot.away_score_pen,
      current.stage
    )
    await db
      .update(matches)
      .set({
        home_score: decision.lockScore.home,
        away_score: decision.lockScore.away,
        home_score_pen: snapshot.home_score_pen,
        away_score_pen: snapshot.away_score_pen,
        qualified_team_code: qualifiedTeamCode,
        result_locked_at: new Date(),
      })
      .where(eq(matches.id, matchId))
    locked = true
    const recalc = await retryRecalculate(matchId, recalculateMatchPredictions)
    if (recalc !== null) {
      console.log(`[reconciliation] match ${matchId} LOCKED. Recalculated ${recalc.updated} predictions.`)
    }
    // Verifica se a fase foi concluída e notifica abertura da próxima
    const [lockedMatch] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1)
    if (lockedMatch) {
      checkAndNotifyPhaseOpen(lockedMatch).catch((err) =>
        console.error(`[reconciliation] falha ao verificar phase-open para match ${matchId}:`, err)
      )
      // Best-effort: champion notification must never derrubar o lock
      checkAndNotifyPhaseChampion(lockedMatch).catch((err) =>
        console.error(`[reconciliation] falha ao verificar phase-champion para match ${matchId}:`, err)
      )
    }
  }

  return { updated: !sameAsStored, locked }
}
