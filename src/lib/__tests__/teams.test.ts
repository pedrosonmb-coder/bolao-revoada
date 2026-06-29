import { describe, it, expect } from 'vitest'
import { getTeamName, getAllTeams, getTeamDisplay } from '../teams'

describe('getTeamName', () => {
  it('retorna nome para TLA válido', () => {
    expect(getTeamName('BRA')).toBe('Brasil')
    expect(getTeamName('ARG')).toBe('Argentina')
  })

  it('case-insensitive', () => {
    expect(getTeamName('bra')).toBe('Brasil')
    expect(getTeamName('Fra')).toBe('França')
  })

  it('retorna null para TLA desconhecido', () => {
    expect(getTeamName('XXX')).toBeNull()
    expect(getTeamName('')).toBeNull()
  })
})

describe('getAllTeams', () => {
  it('retorna array não vazio', () => {
    const teams = getAllTeams()
    expect(teams.length).toBeGreaterThan(0)
  })

  it('cada time tem tla, name e flag', () => {
    const teams = getAllTeams()
    for (const t of teams) {
      expect(t.tla).toBeTruthy()
      expect(t.name).toBeTruthy()
      expect(t.flag).toBeTruthy()
    }
  })

  it('lista está ordenada alfabeticamente por nome', () => {
    const teams = getAllTeams()
    for (let i = 1; i < teams.length; i++) {
      expect(
        teams[i - 1].name.localeCompare(teams[i].name, 'pt-BR')
      ).toBeLessThanOrEqual(0)
    }
  })

  it('BRA está na lista com flag correta', () => {
    const teams = getAllTeams()
    const bra = teams.find((t) => t.tla === 'BRA')
    expect(bra).toBeDefined()
    expect(bra?.name).toBe('Brasil')
    expect(bra?.flag).toBe('🇧🇷')
  })

  it('ENG usa flag especial de subdivisão', () => {
    const teams = getAllTeams()
    const eng = teams.find((t) => t.tla === 'ENG')
    expect(eng?.flag).toBe('🏴󠁧󠁢󠁥󠁮󠁧󠁿')
  })
})

describe('getTeamDisplay — aliases CUR/CUW (Curaçao)', () => {
  it('CUW retorna Curaçao com bandeira 🇨🇼', () => {
    const { name, flag } = getTeamDisplay('CUW')
    expect(name).toBe('Curaçao')
    expect(flag).toBe('🇨🇼')
  })

  it('CUR retorna Curaçao com bandeira 🇨🇼 (não fallback)', () => {
    const { name, flag } = getTeamDisplay('CUR')
    expect(name).toBe('Curaçao')
    expect(flag).toBe('🇨🇼')
    expect(flag).not.toBe('🏳️')
    expect(name).not.toBe('CUR')
  })
})
