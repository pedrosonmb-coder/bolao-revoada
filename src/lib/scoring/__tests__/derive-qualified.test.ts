import { describe, it, expect } from 'vitest'
import { deriveQualifiedTeamCode } from '../derive-qualified'

describe('deriveQualifiedTeamCode', () => {
  it('fase de grupo → sempre null', () => {
    expect(deriveQualifiedTeamCode(3, 0, null, null, 'group')).toBeNull()
    expect(deriveQualifiedTeamCode(1, 2, null, null, 'group')).toBeNull()
    expect(deriveQualifiedTeamCode(1, 1, 5, 4, 'group')).toBeNull()
  })

  it('home vence nos 90min → home', () => {
    expect(deriveQualifiedTeamCode(2, 1, null, null, 'qf')).toBe('home')
    expect(deriveQualifiedTeamCode(3, 0, null, null, 'r32')).toBe('home')
  })

  it('away vence nos 90min → away', () => {
    expect(deriveQualifiedTeamCode(0, 1, null, null, 'sf')).toBe('away')
    expect(deriveQualifiedTeamCode(1, 3, null, null, 'final')).toBe('away')
  })

  it('empate + home vence nos pênaltis → home', () => {
    expect(deriveQualifiedTeamCode(1, 1, 5, 4, 'qf')).toBe('home')
    expect(deriveQualifiedTeamCode(0, 0, 3, 2, 'r16')).toBe('home')
  })

  it('empate + away vence nos pênaltis → away', () => {
    expect(deriveQualifiedTeamCode(1, 1, 3, 4, 'sf')).toBe('away')
    expect(deriveQualifiedTeamCode(2, 2, 2, 5, 'final')).toBe('away')
  })

  it('empate + penaltis null (resultado ainda não disponível) → null', () => {
    expect(deriveQualifiedTeamCode(1, 1, null, null, 'qf')).toBeNull()
    expect(deriveQualifiedTeamCode(0, 0, null, null, 'final')).toBeNull()
  })

  it('empate + apenas home_pen disponível → null', () => {
    expect(deriveQualifiedTeamCode(1, 1, 5, null, 'qf')).toBeNull()
  })

  it('todas as fases knockout reconhecidas', () => {
    for (const stage of ['r32', 'r16', 'qf', 'sf', '3rd', 'final']) {
      expect(deriveQualifiedTeamCode(2, 0, null, null, stage)).toBe('home')
    }
  })
})
