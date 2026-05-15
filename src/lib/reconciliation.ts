import { db } from '@/lib/db'
import { matches, matchSnapshots } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import type { Match } from '@/lib/db/schema'
import { fetchMatchFromFootballData } from './data-sources/football-data'
import { fetchMatchFromFifa } from './data-sources/fifa'
import { fetchMatchFromGE } from './data-sources/ge'
import { fetchMatchFromWikipedia } from './data-sources/wikipedia'
import type { MatchSnapshot } from './data-sources/types'

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
    (s): s is MatchSnapshot => s !== null
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

  const phase2: MatchSnapshot[] = [geSnapshot, wikiSnapshot].filter(
    (s): s is MatchSnapshot => s !== null
  )

  await Promise.all(phase2.map((s) => saveSnapshot(match.id, s)))

  const all = [...phase1, ...phase2]

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
    return { updated: false, locked: false }
  }

  const snapshot = result.kind === 'agreed' ? result.snapshot : result.snapshot

  // Busca estado atual para idempotência
  const [current] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1)

  if (!current) return { updated: false, locked: false }

  // Já está locked — não sobrescreve
  if (current.result_locked_at) return { updated: false, locked: false }

  const sameAsStored =
    current.home_score === snapshot.home_score &&
    current.away_score === snapshot.away_score &&
    current.status === snapshot.status

  if (!sameAsStored) {
    await db
      .update(matches)
      .set({
        home_score: snapshot.home_score,
        away_score: snapshot.away_score,
        home_score_pen: snapshot.home_score_pen,
        away_score_pen: snapshot.away_score_pen,
        status: snapshot.status ?? current.status,
      })
      .where(eq(matches.id, matchId))
  }

  // Verifica lock: status finished + 10 snapshots consecutivos concordando
  let locked = false
  if (snapshot.status === 'finished' && result.kind === 'agreed') {
    const recent = await db
      .select()
      .from(matchSnapshots)
      .where(eq(matchSnapshots.match_id, matchId))
      .orderBy(desc(matchSnapshots.fetched_at))
      .limit(10)

    if (recent.length >= 10) {
      const allAgree = recent.every(
        (s) =>
          s.home_score === snapshot.home_score &&
          s.away_score === snapshot.away_score
      )
      if (allAgree) {
        await db
          .update(matches)
          .set({ result_locked_at: new Date() })
          .where(eq(matches.id, matchId))
        locked = true
        // Dispara recálculo de pontuação (Fase 5)
        console.log(`[reconciliation] Match ${matchId} LOCKED — aguarda Fase 5 para recálculo`)
      }
    }
  }

  return { updated: !sameAsStored, locked }
}
