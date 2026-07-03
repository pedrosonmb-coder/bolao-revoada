import { describe, it, expect } from 'vitest'
import { penaltyCheckAlertMessage } from '../messages'

const matchWithPens = {
  id: 84,
  home_team_name: 'Portugal',
  away_team_name: 'Croácia',
  home_score: 2,
  away_score: 2,
  home_score_pen: 5,
  away_score_pen: 3,
  qualified_team_code: 'home',
}

describe('penaltyCheckAlertMessage', () => {
  it('contém match_id, nomes dos times e emoji de alerta', () => {
    const text = penaltyCheckAlertMessage(matchWithPens)
    expect(text).toContain('84')
    expect(text).toContain('Portugal')
    expect(text).toContain('Croácia')
    expect(text).toContain('⚠️')
  })

  it('contém placar normal e placar de pênaltis', () => {
    const text = penaltyCheckAlertMessage(matchWithPens)
    expect(text).toContain('2-2')
    expect(text).toContain('5-3')
  })

  it('contém o qualified_team_code', () => {
    const text = penaltyCheckAlertMessage(matchWithPens)
    expect(text).toContain('home')
  })

  it('contém instrução de override', () => {
    const text = penaltyCheckAlertMessage(matchWithPens)
    expect(text).toContain('/api/admin/matches/84/override')
  })

  it('usa ? para valores null', () => {
    const m = { ...matchWithPens, home_score_pen: null, away_score_pen: null, qualified_team_code: null }
    const text = penaltyCheckAlertMessage(m)
    expect(text).toContain('?-?')
    expect(text).toContain('classificado: null')
  })
})
