import { describe, it, expect } from 'vitest'
import { staleMatchAlertMessage } from '../messages'

const match = {
  id: 42,
  home_team_name: 'México',
  away_team_name: 'África do Sul',
  kickoff_at: new Date('2026-06-11T19:00:00.000Z'),
  status: 'finished',
}

describe('staleMatchAlertMessage', () => {
  it('contém match_id, nomes dos times e emoji de alerta', () => {
    const text = staleMatchAlertMessage(match)
    expect(text).toContain('42')
    expect(text).toContain('México')
    expect(text).toContain('África do Sul')
    expect(text).toContain('⚠️')
  })

  it('contém o status do jogo', () => {
    const text = staleMatchAlertMessage(match)
    expect(text).toContain('finished')
  })

  it('contém o kickoff em UTC', () => {
    const text = staleMatchAlertMessage(match)
    expect(text).toContain('2026-06-11 19:00 UTC')
  })

  it('aceita kickoff_at como timestamp unix (número)', () => {
    const matchNum = { ...match, kickoff_at: Math.floor(new Date('2026-06-11T19:00:00Z').getTime() / 1000) }
    const text = staleMatchAlertMessage(matchNum)
    expect(text).toContain('2026-06-11 19:00 UTC')
    expect(text).toContain('México')
  })

  it('instrução de ação presente', () => {
    const text = staleMatchAlertMessage(match)
    expect(text).toContain('Travar manualmente')
  })
})
