import { describe, it, expect } from 'vitest'
import { isPlausibleSnapshot, selectConsensusSnapshots } from '../validate'
import type { MatchSnapshot } from '../types'

function snap(
  source: 'football-data' | 'fifa' | 'ge' | 'wikipedia',
  home: number | null,
  away: number | null,
  status: MatchSnapshot['status'] = 'finished'
): MatchSnapshot {
  return {
    source,
    status,
    home_score: home,
    away_score: away,
    home_score_pen: null,
    away_score_pen: null,
    raw_payload: {},
    fetched_at: new Date(),
  }
}

const fd41 = snap('football-data', 4, 1)
const fifa41 = snap('fifa', 4, 1)
const wiki2025_8 = snap('wikipedia', 2025, 8)
const wiki31 = snap('wikipedia', 3, 1)
const wiki21 = snap('wikipedia', 2, 1)

describe('isPlausibleSnapshot', () => {
  it('placar normal 4-1 → plausível', () => {
    expect(isPlausibleSnapshot(fd41)).toBe(true)
  })

  it('T1/T6: placar 2025-8 (Wikipedia regex) → implausível (>20)', () => {
    expect(isPlausibleSnapshot(wiki2025_8)).toBe(false)
  })

  it('T5: scheduled com scores null → plausível (não descarta agendados)', () => {
    expect(isPlausibleSnapshot(snap('football-data', null, null, 'scheduled'))).toBe(true)
  })

  it('live com scores null → plausível', () => {
    expect(isPlausibleSnapshot(snap('football-data', null, null, 'live'))).toBe(true)
  })

  it('score negativo → implausível', () => {
    expect(isPlausibleSnapshot(snap('football-data', -1, 0))).toBe(false)
  })

  it('score exatamente 20 → plausível (limite superior)', () => {
    expect(isPlausibleSnapshot(snap('ge', 20, 0))).toBe(true)
  })

  it('score 21 → implausível (acima do limite)', () => {
    expect(isPlausibleSnapshot(snap('ge', 21, 0))).toBe(false)
  })
})

describe('selectConsensusSnapshots', () => {
  it('T1: fd=4-1 + wiki=2025-8 implausível → só fd entra no consenso', () => {
    const result = selectConsensusSnapshots({
      phase1Snapshots: [fd41],
      geSnapshot: null,
      wikiSnapshot: wiki2025_8,
    })
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('football-data')
  })

  it('T2: fd=4-1 + wiki=3-1 plausível mas estruturada respondeu → só fd (sem conflito)', () => {
    // Caso que o filtro de sanidade sozinho NÃO resolve: ambos plausíveis, divergem
    // → Part B garante que Wikipedia não entra porque fonte estruturada respondeu
    const result = selectConsensusSnapshots({
      phase1Snapshots: [fd41],
      geSnapshot: null,
      wikiSnapshot: wiki31,
    })
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('football-data')
    expect(result[0].home_score).toBe(4)
    expect(result[0].away_score).toBe(1)
  })

  it('T3: só Wikipedia responde com placar plausível → entra como último recurso', () => {
    const result = selectConsensusSnapshots({
      phase1Snapshots: [],
      geSnapshot: null,
      wikiSnapshot: wiki21,
    })
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('wikipedia')
    expect(result[0].home_score).toBe(2)
  })

  it('T3b: só Wikipedia responde mas com placar implausível → all_failed (0 no consenso)', () => {
    const result = selectConsensusSnapshots({
      phase1Snapshots: [],
      geSnapshot: null,
      wikiSnapshot: wiki2025_8,
    })
    expect(result).toHaveLength(0)
  })

  it('T4: fd + fifa concordam 4-1 → ambos no consenso (agreed normal intacto)', () => {
    const result = selectConsensusSnapshots({
      phase1Snapshots: [fd41, fifa41],
      geSnapshot: null,
      wikiSnapshot: null,
    })
    expect(result).toHaveLength(2)
    expect(result.every((s) => s.home_score === 4 && s.away_score === 1)).toBe(true)
  })

  it('T6: simulação USA×PAR — fd=4-1 + wiki=2025-8 → 1 fonte no consenso → trava rápido', () => {
    // Reproduz a série real de 2026-06-13:
    // football-data stable 4-1, Wikipedia retornou 2025-8 (ano + índice de linha).
    // Com o fix (Opção A): isPlausibleSnapshot retorna false → reconciliation.ts descarta
    // ANTES do saveSnapshot → banco nunca vê 2025-8 → query de lock protegida sem filtro
    // próprio. partial → trava 4-1 em ~6 min em vez de 7h de conflict.
    expect(isPlausibleSnapshot(wiki2025_8)).toBe(false) // garante que não será salvo no banco
    const result = selectConsensusSnapshots({
      phase1Snapshots: [fd41],
      geSnapshot: null,
      wikiSnapshot: wiki2025_8,
    })
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('football-data')
    expect(result[0].home_score).toBe(4)
    expect(result[0].away_score).toBe(1)
    // all.length === 1 → reconcileMatch retornaria { kind: 'partial' } → lock em 3 polls
  })
})
