import { describe, it, expect } from 'vitest'
import { missingQualifierAlertMessage } from '../messages'

const base = {
  id: 99,
  home_team_name: 'Brasil',
  away_team_name: 'Argentina',
  home_score: 1,
  away_score: 1,
}

describe('missingQualifierAlertMessage', () => {
  it('contém match_id, nomes e emoji de alerta', () => {
    const text = missingQualifierAlertMessage(base)
    expect(text).toContain('99')
    expect(text).toContain('Brasil')
    expect(text).toContain('Argentina')
    expect(text).toContain('⚠️')
  })

  it('contém o placar empatado', () => {
    const text = missingQualifierAlertMessage(base)
    expect(text).toContain('1-1')
  })

  it('contém instrução de override', () => {
    const text = missingQualifierAlertMessage(base)
    expect(text).toContain('/api/admin/matches/99/override')
  })

  it('menciona penaltis/prorrogacao', () => {
    const text = missingQualifierAlertMessage(base)
    expect(text.toLowerCase()).toContain('penaltis')
    expect(text.toLowerCase()).toContain('prorrogacao')
  })

  it('usa ? para scores null', () => {
    const text = missingQualifierAlertMessage({ ...base, home_score: null, away_score: null })
    expect(text).toContain('?-?')
  })
})
