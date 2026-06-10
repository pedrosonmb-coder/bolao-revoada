import { describe, it, expect } from 'vitest'
import { validateBracketOverride } from '../bracket-override'

describe('validateBracketOverride', () => {
  it('retorna erro 400 para jogos de grupo', () => {
    const r = validateBracketOverride({ home_team_code: 'BRA', away_team_code: 'ARG', stage: 'group' })
    expect(r.valid).toBe(false)
    if (!r.valid) {
      expect(r.status).toBe(400)
      expect(r.error).toMatch(/grupos/)
    }
  })

  it('retorna erro 400 para TLA inválido no time da casa', () => {
    const r = validateBracketOverride({ home_team_code: 'XXX', away_team_code: 'ARG', stage: 'qf' })
    expect(r.valid).toBe(false)
    if (!r.valid) {
      expect(r.status).toBe(400)
      expect(r.error).toContain('XXX')
    }
  })

  it('retorna erro 400 para TLA inválido no time visitante', () => {
    const r = validateBracketOverride({ home_team_code: 'BRA', away_team_code: 'ZZZ', stage: 'sf' })
    expect(r.valid).toBe(false)
    if (!r.valid) {
      expect(r.status).toBe(400)
      expect(r.error).toContain('ZZZ')
    }
  })

  it('retorna nomes corretos para times válidos em qf', () => {
    const r = validateBracketOverride({ home_team_code: 'BRA', away_team_code: 'ARG', stage: 'qf' })
    expect(r.valid).toBe(true)
    if (r.valid) {
      expect(r.home_name).toBe('Brasil')
      expect(r.away_name).toBe('Argentina')
    }
  })

  it('aceita TLAs em minúsculo (case-insensitive)', () => {
    const r = validateBracketOverride({ home_team_code: 'bra', away_team_code: 'fra', stage: 'final' })
    expect(r.valid).toBe(true)
    if (r.valid) {
      expect(r.home_name).toBe('Brasil')
      expect(r.away_name).toBe('França')
    }
  })

  it('aceita stage r32', () => {
    const r = validateBracketOverride({ home_team_code: 'ENG', away_team_code: 'SCO', stage: 'r32' })
    expect(r.valid).toBe(true)
    if (r.valid) {
      expect(r.home_name).toBe('Inglaterra')
      expect(r.away_name).toBe('Escócia')
    }
  })
})
