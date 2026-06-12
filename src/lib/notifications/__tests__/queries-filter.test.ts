import { describe, it, expect } from 'vitest'
import { filterMatchesWithoutSummary } from '../filter-helpers'
import type { Match } from '@/lib/db/schema'

function makeMatch(id: number): Match {
  return {
    id,
    fifa_id: null,
    fd_id: null,
    stage: 'group',
    disagreement_count: 0,
    group_name: 'A',
    match_number: id,
    home_team_code: 'MEX',
    home_team_name: 'México',
    away_team_code: 'RSA',
    away_team_name: 'África do Sul',
    kickoff_at: new Date('2026-06-11T19:00:00Z'),
    venue: null,
    city: null,
    country: null,
    status: 'finished',
    home_score: 2,
    away_score: 0,
    home_score_pen: null,
    away_score_pen: null,
    result_locked_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    predictions_close_at: new Date('2026-06-11T19:00:00Z'),
    created_at: new Date(),
    updated_at: null,
  } as unknown as Match
}

describe('filterMatchesWithoutSummary', () => {
  it('exclui jogo cujo post_match_top já foi enviado', () => {
    const match = makeMatch(1)
    const result = filterMatchesWithoutSummary([match], new Set([1]))
    expect(result).toHaveLength(0)
  })

  it('inclui jogo sem post_match_top enviado', () => {
    const match = makeMatch(1)
    const result = filterMatchesWithoutSummary([match], new Set())
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('filtra apenas os jogos com envio, mantendo os sem envio', () => {
    const m1 = makeMatch(1)
    const m2 = makeMatch(2)
    const m3 = makeMatch(3)
    // m1 já enviado, m2 e m3 não
    const result = filterMatchesWithoutSummary([m1, m2, m3], new Set([1]))
    expect(result).toHaveLength(2)
    expect(result.map((m) => m.id)).toEqual([2, 3])
  })

  it('retorna lista vazia quando todos já foram enviados', () => {
    const m1 = makeMatch(1)
    const m2 = makeMatch(2)
    const result = filterMatchesWithoutSummary([m1, m2], new Set([1, 2]))
    expect(result).toHaveLength(0)
  })

  it('retorna lista completa quando nenhum foi enviado', () => {
    const m1 = makeMatch(10)
    const m2 = makeMatch(20)
    const result = filterMatchesWithoutSummary([m1, m2], new Set([99, 100]))
    expect(result).toHaveLength(2)
  })
})
