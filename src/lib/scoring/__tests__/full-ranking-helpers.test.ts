import { describe, it, expect } from 'vitest'
import {
  computeDistribution,
  findBestMatch,
  findWorstMatch,
  computeUserAvg,
  computeGroupAvg,
} from '../full-ranking-helpers'

// Factory sem placar real (usado em testes de fallback e de best)
const match = (id: number, pts: number, base: number) => ({
  match_id: id,
  home_team_code: 'AAA',
  away_team_code: 'BBB',
  points_awarded: pts,
  base_points: base,
})

// Factory com placar real e palpite (usado em testes de distância)
const matchFull = (
  id: number,
  pts: number,
  base: number,
  hs: number,
  as_: number,
  ph: number,
  pa: number
) => ({
  match_id: id,
  home_team_code: 'AAA',
  away_team_code: 'BBB',
  points_awarded: pts,
  base_points: base,
  home_score: hs,
  away_score: as_,
  palpite_home: ph,
  palpite_away: pa,
})

describe('computeDistribution', () => {
  it('contagem correta por faixa de base_points', () => {
    const preds = [
      { base_points: 25 },
      { base_points: 25 },
      { base_points: 18 },
      { base_points: 15 },
      { base_points: 12 },
      { base_points: 10 },
      { base_points: 0 },
      { base_points: 0 },
    ]
    expect(computeDistribution(preds)).toEqual({
      exact: 2,
      score_diff: 1,
      winner_goals_w: 1,
      winner_goals_l: 1,
      winner_only: 1,
      miss: 2,
    })
  })

  it('array vazio → tudo zero', () => {
    expect(computeDistribution([])).toEqual({
      exact: 0,
      score_diff: 0,
      winner_goals_w: 0,
      winner_goals_l: 0,
      winner_only: 0,
      miss: 0,
    })
  })

  it('só placares exatos → exact=N, resto 0', () => {
    const preds = [{ base_points: 25 }, { base_points: 25 }, { base_points: 25 }]
    const dist = computeDistribution(preds)
    expect(dist.exact).toBe(3)
    expect(dist.miss).toBe(0)
    expect(dist.winner_only).toBe(0)
  })
})

describe('findBestMatch', () => {
  it('retorna o de maior points_awarded', () => {
    const result = findBestMatch([match(1, 10, 10), match(2, 50, 25), match(3, 18, 18)])
    expect(result?.match_id).toBe(2)
    expect(result?.points_awarded).toBe(50)
  })

  it('empate → retorna o primeiro (estável)', () => {
    const result = findBestMatch([match(1, 25, 25), match(2, 25, 25)])
    expect(result?.match_id).toBe(1)
  })

  it('array vazio → null', () => {
    expect(findBestMatch([])).toBeNull()
  })

  it('único elemento → retorna ele', () => {
    const result = findBestMatch([match(7, 0, 0)])
    expect(result?.match_id).toBe(7)
  })
})

describe('findWorstMatch', () => {
  it('null quando não há palpites com 0 pontos', () => {
    const preds = [
      matchFull(1, 10, 10, 1, 0, 1, 0),
      matchFull(2, 18, 18, 2, 1, 2, 1),
    ]
    expect(findWorstMatch(preds)).toBeNull()
  })

  it('null quando zeros existem mas sem placar real', () => {
    const preds = [
      match(1, 0, 0),
      matchFull(2, 10, 10, 1, 0, 0, 1),
    ]
    expect(findWorstMatch(preds)).toBeNull()
  })

  it('retorna o zero com maior distância', () => {
    // id1: 0 pts, dist = |0-1| + |1-0| = 2
    // id2: 0 pts, dist = |0-3| + |1-0| = 4  ← maior
    // id3: 10 pts → não candidato
    const preds = [
      matchFull(1, 0, 0, 1, 0, 0, 1),
      matchFull(2, 0, 0, 3, 0, 0, 1),
      matchFull(3, 10, 10, 1, 0, 1, 0),
    ]
    expect(findWorstMatch(preds)?.match_id).toBe(2)
  })

  it('10 pts + grande distância NÃO é tropeço', () => {
    const preds = [
      matchFull(1, 10, 10, 3, 0, 0, 3),
      matchFull(2,  0,  0, 1, 0, 0, 1),
    ]
    expect(findWorstMatch(preds)?.match_id).toBe(2)
  })

  it('empate em distância → retorna o primeiro (estável)', () => {
    const preds = [
      matchFull(1, 0, 0, 1, 1, 0, 0),
      matchFull(2, 0, 0, 1, 1, 0, 0),
    ]
    expect(findWorstMatch(preds)?.match_id).toBe(1)
  })

  it('único candidato com 0 pts e scores → retorna ele', () => {
    const preds = [
      matchFull(1, 0, 0, 2, 1, 0, 0),
      match(2, 10, 10),
    ]
    expect(findWorstMatch(preds)?.match_id).toBe(1)
  })

  it('array vazio → null', () => {
    expect(findWorstMatch([])).toBeNull()
  })
})

describe('computeUserAvg', () => {
  it('matches_played > 0 → média correta', () => {
    expect(computeUserAvg(150, 10)).toBe(15)
  })

  it('matches_played = 0 → 0 (sem NaN/Infinity)', () => {
    expect(computeUserAvg(0, 0)).toBe(0)
    expect(Number.isFinite(computeUserAvg(0, 0))).toBe(true)
  })

  it('match_points = 0 com jogos pontuados → 0', () => {
    expect(computeUserAvg(0, 5)).toBe(0)
  })
})

describe('computeGroupAvg', () => {
  it('valor numérico → retorna o valor', () => {
    expect(computeGroupAvg(12.5)).toBe(12.5)
  })

  it('null (nenhuma prediction computada ainda) → 0', () => {
    expect(computeGroupAvg(null)).toBe(0)
  })

  it('undefined → 0', () => {
    expect(computeGroupAvg(undefined)).toBe(0)
  })

  it('zero → 0 (não confunde com null)', () => {
    expect(computeGroupAvg(0)).toBe(0)
  })
})
