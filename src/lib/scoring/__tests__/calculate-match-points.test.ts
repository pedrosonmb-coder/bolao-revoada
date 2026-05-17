import { describe, it, expect } from 'vitest'
import { calculateMatchPoints } from '../calculate-match-points'

const group = 'group' as const
const qf = 'qf' as const
const r32 = 'r32' as const
const sf = 'sf' as const
const final = 'final' as const
const third = '3rd' as const

describe('calculateMatchPoints', () => {
  it('placar exato 2x1 em group → base 25, multiplier 1.0, total 25', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: null },
      { stage: group, home_score: 2, away_score: 1, qualified_team_code: null }
    )
    expect(r.base_points).toBe(25)
    expect(r.multiplier).toBe(1.0)
    expect(r.points_awarded).toBe(25)
  })

  it('placar exato 2x1 em qf → base 25, multiplier 2.5, total 62.5', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: null },
      { stage: qf, home_score: 2, away_score: 1, qualified_team_code: null }
    )
    expect(r.base_points).toBe(25)
    expect(r.multiplier).toBe(2.5)
    expect(r.points_awarded).toBe(62.5)
  })

  it('vencedor + saldo correto (palpite 2x1, real 3x2) → base 18', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: null },
      { stage: group, home_score: 3, away_score: 2, qualified_team_code: null }
    )
    expect(r.base_points).toBe(18)
    expect(r.points_awarded).toBe(18)
  })

  it('vencedor + gols do vencedor (palpite 2x1, real 2x0) → base 15', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: null },
      { stage: group, home_score: 2, away_score: 0, qualified_team_code: null }
    )
    expect(r.base_points).toBe(15)
  })

  it('vencedor + gols do perdedor (palpite 2x1, real 3x1) → base 12', () => {
    // Saldo: palpite=1, real=2 → saldo diferente. Gols vencedor: palpite=2, real=3 → diferente. Gols perdedor: ambos 1 → igual.
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: null },
      { stage: group, home_score: 3, away_score: 1, qualified_team_code: null }
    )
    expect(r.base_points).toBe(12)
  })

  it('só o vencedor (palpite 2x1, real 4x0) → base 10', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: null },
      { stage: group, home_score: 4, away_score: 0, qualified_team_code: null }
    )
    expect(r.base_points).toBe(10)
  })

  it('errou o vencedor (palpite 2x1, real 1x2) → base 0', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: null },
      { stage: group, home_score: 1, away_score: 2, qualified_team_code: null }
    )
    expect(r.base_points).toBe(0)
    expect(r.points_awarded).toBe(0)
  })

  it('empate previsto, empate ocorrido, placar diferente (1x1 vs 2x2) → 10', () => {
    const r = calculateMatchPoints(
      { home_score: 1, away_score: 1, qualified_team_code: null },
      { stage: group, home_score: 2, away_score: 2, qualified_team_code: null }
    )
    expect(r.base_points).toBe(10)
  })

  it('empate previsto, vitória ocorrida (1x1 vs 2x1) → 0', () => {
    const r = calculateMatchPoints(
      { home_score: 1, away_score: 1, qualified_team_code: null },
      { stage: group, home_score: 2, away_score: 1, qualified_team_code: null }
    )
    expect(r.base_points).toBe(0)
  })

  it('vitória prevista, empate ocorrido (2x1 vs 1x1) → 0', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: null },
      { stage: group, home_score: 1, away_score: 1, qualified_team_code: null }
    )
    expect(r.base_points).toBe(0)
  })

  it('mata-mata r32 placar exato + acertou classificação → (25+5)*1.5 = 45', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: 'home' },
      { stage: r32, home_score: 2, away_score: 1, qualified_team_code: 'home' }
    )
    expect(r.base_points).toBe(25)
    expect(r.classification_bonus).toBe(5)
    expect(r.multiplier).toBe(1.5)
    expect(r.points_awarded).toBe(45)
  })

  it('mata-mata sf vencedor+saldo + acertou classificação → (18+5)*3.0 = 69', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: 'home' },
      { stage: sf, home_score: 3, away_score: 2, qualified_team_code: 'home' }
    )
    expect(r.base_points).toBe(18)
    expect(r.classification_bonus).toBe(5)
    expect(r.multiplier).toBe(3.0)
    expect(r.points_awarded).toBe(69)
  })

  it('final placar 1x1 (pênaltis), palpitou 1x1 e acertou quem passou → (25+5)*4.0 = 120', () => {
    const r = calculateMatchPoints(
      { home_score: 1, away_score: 1, qualified_team_code: 'away' },
      { stage: final, home_score: 1, away_score: 1, qualified_team_code: 'away' }
    )
    expect(r.base_points).toBe(25)
    expect(r.classification_bonus).toBe(5)
    expect(r.multiplier).toBe(4.0)
    expect(r.points_awarded).toBe(120)
  })

  it('3rd lugar placar exato + classificação → (25+5)*2.0 = 60', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 0, qualified_team_code: 'home' },
      { stage: third, home_score: 2, away_score: 0, qualified_team_code: 'home' }
    )
    expect(r.base_points).toBe(25)
    expect(r.classification_bonus).toBe(5)
    expect(r.multiplier).toBe(2.0)
    expect(r.points_awarded).toBe(60)
  })

  it('group stage — classificação não conta (bonus sempre 0)', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: 'home' },
      { stage: group, home_score: 2, away_score: 1, qualified_team_code: 'home' }
    )
    expect(r.classification_bonus).toBe(0)
    expect(r.points_awarded).toBe(25)
  })

  it('mata-mata errou classificação → bonus 0', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: 'away' },
      { stage: qf, home_score: 2, away_score: 1, qualified_team_code: 'home' }
    )
    expect(r.classification_bonus).toBe(0)
    expect(r.points_awarded).toBe(25 * 2.5)
  })
})
