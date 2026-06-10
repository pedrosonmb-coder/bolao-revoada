import { describe, it, expect } from 'vitest'
import { bracketDefinedMessage } from '../messages'

const twoMatches = [
  { home_team_code: 'BRA', home_team_name: 'Brasil', away_team_code: 'FRA', away_team_name: 'França' },
  { home_team_code: 'ARG', home_team_name: 'Argentina', away_team_code: 'ESP', away_team_name: 'Espanha' },
]

describe('bracketDefinedMessage — D.3', () => {
  it('contém label da fase (r16 = Oitavas de final)', () => {
    const text = bracketDefinedMessage('r16', twoMatches)
    expect(text).toContain('Oitavas de final')
  })

  it('contém ambas as partidas com bandeiras e nomes', () => {
    const text = bracketDefinedMessage('r16', twoMatches)
    expect(text).toContain('Brasil')
    expect(text).toContain('França')
    expect(text).toContain('Argentina')
    expect(text).toContain('Espanha')
    expect(text).toContain('🇧🇷')
    expect(text).toContain('🇫🇷')
  })

  it('contém CTA de palpitar', () => {
    const text = bracketDefinedMessage('r16', twoMatches)
    expect(text).toContain('palpitar')
  })

  it('fase desconhecida usa o stage bruto como label', () => {
    const text = bracketDefinedMessage('custom_stage', twoMatches)
    expect(text).toContain('custom_stage')
  })

  it('1 jogo → texto inclui apenas esse jogo', () => {
    const text = bracketDefinedMessage('qf', [twoMatches[0]])
    expect(text).toContain('Brasil')
    expect(text).not.toContain('Argentina')
  })
})
