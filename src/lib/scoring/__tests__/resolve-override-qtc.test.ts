import { describe, it, expect } from 'vitest'
import { resolveOverrideQualifiedTeamCode } from '../resolve-override-qtc'

describe('resolveOverrideQualifiedTeamCode', () => {
  it('não-empate: home vence → home', () => {
    expect(resolveOverrideQualifiedTeamCode('r32', 2, 1, null, null, undefined)).toBe('home')
    expect(resolveOverrideQualifiedTeamCode('r16', 3, 0, null, null, undefined)).toBe('home')
  })

  it('não-empate: away vence → away', () => {
    expect(resolveOverrideQualifiedTeamCode('qf', 0, 1, null, null, undefined)).toBe('away')
    expect(resolveOverrideQualifiedTeamCode('sf', 1, 3, null, null, undefined)).toBe('away')
  })

  it('empate com pênaltis: home vence nos pens → home', () => {
    expect(resolveOverrideQualifiedTeamCode('r32', 1, 1, 5, 4, undefined)).toBe('home')
    expect(resolveOverrideQualifiedTeamCode('qf', 0, 0, 3, 2, undefined)).toBe('home')
  })

  it('empate com pênaltis: away vence nos pens → away', () => {
    expect(resolveOverrideQualifiedTeamCode('sf', 2, 2, 3, 5, undefined)).toBe('away')
    expect(resolveOverrideQualifiedTeamCode('final', 1, 1, 2, 4, undefined)).toBe('away')
  })

  it('explicitQTC enviado pelo admin → usa o enviado, ignora placar', () => {
    // Admin envia 'away' para empate sem pens — usa o enviado
    expect(resolveOverrideQualifiedTeamCode('r32', 1, 1, null, null, 'away')).toBe('away')
    // Admin envia 'away' mesmo com home vencendo — explícito prevalece
    expect(resolveOverrideQualifiedTeamCode('r16', 2, 1, null, null, 'away')).toBe('away')
    // Admin envia 'home' mesmo com away vencendo — explícito prevalece
    expect(resolveOverrideQualifiedTeamCode('qf', 0, 2, null, null, 'home')).toBe('home')
  })

  it('grupo → null (não aplica qualified_team_code)', () => {
    expect(resolveOverrideQualifiedTeamCode('group', 2, 1, null, null, undefined)).toBeNull()
    expect(resolveOverrideQualifiedTeamCode('group', 0, 0, null, null, undefined)).toBeNull()
    // explicitQTC não deve ser enviado em grupos, mas se vier, respeita o explícito
    // (a rota rejeita knockout+draw sem qtc; grupos não passam pelo guard)
    expect(resolveOverrideQualifiedTeamCode('group', 2, 1, null, null, 'home')).toBe('home')
  })

  it('empate sem pens e sem explicitQTC → null', () => {
    expect(resolveOverrideQualifiedTeamCode('r32', 1, 1, null, null, undefined)).toBeNull()
    expect(resolveOverrideQualifiedTeamCode('final', 0, 0, null, null, undefined)).toBeNull()
  })
})
