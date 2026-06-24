import { describe, it, expect } from 'vitest'
import { calculateMatchPoints } from '../calculate-match-points'

const group = 'group' as const
const qf = 'qf' as const
const r32 = 'r32' as const
const sf = 'sf' as const
const final = 'final' as const
const third = '3rd' as const

describe('calculateMatchPoints — fase de grupos', () => {
  it('placar exato 2x1 → base 25, multiplier 1.0, total 25', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: null },
      { stage: group, home_score: 2, away_score: 1, qualified_team_code: null }
    )
    expect(r.base_points).toBe(25)
    expect(r.multiplier).toBe(1.0)
    expect(r.classification_bonus).toBe(0)
    expect(r.points_awarded).toBe(25)
  })

  it('vencedor + saldo correto (palpite 2x1, real 3x2) → base 18, total 18', () => {
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

  it('errou o vencedor (palpite 2x1, real 1x2) → base 0, total 0', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: null },
      { stage: group, home_score: 1, away_score: 2, qualified_team_code: null }
    )
    expect(r.base_points).toBe(0)
    expect(r.points_awarded).toBe(0)
  })

  it('empate previsto, empate ocorrido, placar diferente (1x1 vs 2x2) → base 10', () => {
    const r = calculateMatchPoints(
      { home_score: 1, away_score: 1, qualified_team_code: null },
      { stage: group, home_score: 2, away_score: 2, qualified_team_code: null }
    )
    expect(r.base_points).toBe(10)
  })

  it('empate previsto, vitória ocorrida (1x1 vs 2x1) → base 0', () => {
    const r = calculateMatchPoints(
      { home_score: 1, away_score: 1, qualified_team_code: null },
      { stage: group, home_score: 2, away_score: 1, qualified_team_code: null }
    )
    expect(r.base_points).toBe(0)
  })

  it('vitória prevista, empate ocorrido (2x1 vs 1x1) → base 0', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: null },
      { stage: group, home_score: 1, away_score: 1, qualified_team_code: null }
    )
    expect(r.base_points).toBe(0)
  })

  it('grupo — qtc nunca conta (bonus sempre 0)', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: 'home' },
      { stage: group, home_score: 2, away_score: 1, qualified_team_code: 'home' }
    )
    expect(r.classification_bonus).toBe(0)
    expect(r.points_awarded).toBe(25)
  })
})

describe('calculateMatchPoints — mata-mata: fórmula Math.round(base×mult) + 8', () => {
  // Exemplo chave do usuário: cravou 2-1 em QF = 58
  it('QF placar exato 2x1 + acertou classificação explícita → Math.round(25×2.0)+8 = 58', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: 'home' },
      { stage: qf, home_score: 2, away_score: 1, qualified_team_code: 'home' }
    )
    expect(r.base_points).toBe(25)
    expect(r.classification_bonus).toBe(8)
    expect(r.multiplier).toBe(2.0)
    expect(r.points_awarded).toBe(58)
  })

  it('QF placar exato 2x1 sem qtc explícito (FURO 2: deriva de 2>1) → total 58', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: null },
      { stage: qf, home_score: 2, away_score: 1, qualified_team_code: 'home' }
    )
    expect(r.base_points).toBe(25)
    expect(r.classification_bonus).toBe(8)
    expect(r.points_awarded).toBe(58)
  })

  it('QF palpite 1x2 sem qtc explícito (FURO 2: deriva away) e real 1x2 qtc away → total 58', () => {
    const r = calculateMatchPoints(
      { home_score: 1, away_score: 2, qualified_team_code: null },
      { stage: qf, home_score: 1, away_score: 2, qualified_team_code: 'away' }
    )
    expect(r.classification_bonus).toBe(8)
    expect(r.points_awarded).toBe(58)
  })

  it('QF palpite 1x1 sem qtc explícito (FURO 2: empate → não deriva) real 1x1 qtc home → bonus 0', () => {
    const r = calculateMatchPoints(
      { home_score: 1, away_score: 1, qualified_team_code: null },
      { stage: qf, home_score: 1, away_score: 1, qualified_team_code: 'home' }
    )
    expect(r.classification_bonus).toBe(0)
    expect(r.points_awarded).toBe(Math.round(25 * 2.0) + 0)
  })

  it('r32 placar exato + acertou classificação → Math.round(25×1.5)+8 = 38+8 = 46', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: 'home' },
      { stage: r32, home_score: 2, away_score: 1, qualified_team_code: 'home' }
    )
    expect(r.base_points).toBe(25)
    expect(r.classification_bonus).toBe(8)
    expect(r.multiplier).toBe(1.5)
    expect(r.points_awarded).toBe(46)
  })

  it('sf vencedor+saldo + acertou classificação → Math.round(18×2.0)+8 = 36+8 = 44', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: 'home' },
      { stage: sf, home_score: 3, away_score: 2, qualified_team_code: 'home' }
    )
    expect(r.base_points).toBe(18)
    expect(r.classification_bonus).toBe(8)
    expect(r.multiplier).toBe(2.0)
    expect(r.points_awarded).toBe(44)
  })

  // Exemplo chave: final pênaltis com qtc correto = 71
  it('final 1x1 (pênaltis), palpitou 1x1 + acertou qtc → Math.round(25×2.5)+8 = 63+8 = 71', () => {
    const r = calculateMatchPoints(
      { home_score: 1, away_score: 1, qualified_team_code: 'away' },
      { stage: final, home_score: 1, away_score: 1, qualified_team_code: 'away' }
    )
    expect(r.base_points).toBe(25)
    expect(r.classification_bonus).toBe(8)
    expect(r.multiplier).toBe(2.5)
    expect(r.points_awarded).toBe(71)
  })

  it('3rd placar exato + acertou classificação → Math.round(25×2.0)+8 = 50+8 = 58', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 0, qualified_team_code: 'home' },
      { stage: third, home_score: 2, away_score: 0, qualified_team_code: 'home' }
    )
    expect(r.base_points).toBe(25)
    expect(r.classification_bonus).toBe(8)
    expect(r.multiplier).toBe(2.0)
    expect(r.points_awarded).toBe(58)
  })

  it('QF só vencedor (palpite 3x0, real 2x1) + acertou classificação → Math.round(10×2.0)+8 = 28', () => {
    const r = calculateMatchPoints(
      { home_score: 3, away_score: 0, qualified_team_code: 'home' },
      { stage: qf, home_score: 2, away_score: 1, qualified_team_code: 'home' }
    )
    expect(r.base_points).toBe(10)
    expect(r.classification_bonus).toBe(8)
    expect(r.points_awarded).toBe(28)
  })

  it('QF errou classificação → bonus 0, total Math.round(25×2.0)+0 = 50', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: 'away' },
      { stage: qf, home_score: 2, away_score: 1, qualified_team_code: 'home' }
    )
    expect(r.classification_bonus).toBe(0)
    expect(r.points_awarded).toBe(50)
  })

  it('QF match.qualified_team_code null (resultado ainda sem qtc) → bonus 0', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: 'home' },
      { stage: qf, home_score: 2, away_score: 1, qualified_team_code: null }
    )
    expect(r.classification_bonus).toBe(0)
  })

  it('QF errou o placar (0 base) + acertou qtc → total 0+8 = 8', () => {
    const r = calculateMatchPoints(
      { home_score: 2, away_score: 1, qualified_team_code: 'away' },
      { stage: qf, home_score: 1, away_score: 2, qualified_team_code: 'away' }
    )
    expect(r.base_points).toBe(0)
    expect(r.classification_bonus).toBe(8)
    expect(r.points_awarded).toBe(8)
  })
})
