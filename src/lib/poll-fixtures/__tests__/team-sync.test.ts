import { describe, it, expect } from 'vitest'
import { computeTeamCodeChanges, isMatchTbd } from '../team-sync'

const tbdMatch = {
  id: 10,
  stage: 'r16',
  home_team_code: 'TBD',
  home_team_name: 'TBD',
  away_team_code: 'TBD',
  away_team_name: 'TBD',
}

const definedMatch = {
  id: 20,
  stage: 'group',
  home_team_code: 'BRA',
  home_team_name: 'Brasil',
  away_team_code: 'ARG',
  away_team_name: 'Argentina',
}

// ─── D.1 — Sync de times ─────────────────────────────────────────────────────

describe('computeTeamCodeChanges — D.1', () => {
  it('D.1.1 grupo definido + API com mesmo valor → sem changes', () => {
    const { changes, newlyBothDefined } = computeTeamCodeChanges(
      definedMatch,
      { tla: 'BRA', name: 'Brasil' },
      { tla: 'ARG', name: 'Argentina' },
    )
    expect(changes).toEqual({})
    expect(newlyBothDefined).toBe(false)
  })

  it('D.1.1 grupo definido + API com valor diferente → atualiza', () => {
    const { changes } = computeTeamCodeChanges(
      { ...definedMatch, home_team_name: 'Brazil' },
      { tla: 'BRA', name: 'Brasil' },
      { tla: 'ARG', name: 'Argentina' },
    )
    expect(changes.home_team_name).toBe('Brasil')
    expect(changes.away_team_name).toBeUndefined()
  })

  it('D.1.2 TBD + API traz times → atualiza ambos, newlyBothDefined true', () => {
    const { changes, newlyBothDefined } = computeTeamCodeChanges(
      tbdMatch,
      { tla: 'BRA', name: 'Brasil' },
      { tla: 'FRA', name: 'França' },
    )
    expect(changes.home_team_code).toBe('BRA')
    expect(changes.home_team_name).toBe('Brasil')
    expect(changes.away_team_code).toBe('FRA')
    expect(changes.away_team_name).toBe('França')
    expect(newlyBothDefined).toBe(true)
  })

  it('D.1.3 TBD + API ainda sem times (null) → permanece TBD, changes vazio', () => {
    const { changes, newlyBothDefined } = computeTeamCodeChanges(
      tbdMatch,
      { tla: null, name: null },
      { tla: null, name: null },
    )
    expect(changes).toEqual({})
    expect(newlyBothDefined).toBe(false)
  })

  it('D.1.3 TBD + API retorna string vazia → não atualiza', () => {
    const { changes } = computeTeamCodeChanges(
      tbdMatch,
      { tla: '', name: '' },
      { tla: '', name: '' },
    )
    expect(changes).toEqual({})
  })

  it('D.1.4 definido + API retorna null → não sobrescreve', () => {
    const { changes } = computeTeamCodeChanges(
      definedMatch,
      { tla: null, name: null },
      { tla: null, name: null },
    )
    expect(changes).toEqual({})
  })

  it('D.1.4 definido + API retorna "TBD" → não sobrescreve', () => {
    const { changes } = computeTeamCodeChanges(
      definedMatch,
      { tla: 'TBD', name: 'TBD' },
      { tla: 'TBD', name: 'TBD' },
    )
    expect(changes).toEqual({})
  })
})

// ─── D.2 — Guard TBD ─────────────────────────────────────────────────────────

describe('isMatchTbd — D.2', () => {
  it('D.2.1 ambos TBD → true', () => {
    expect(isMatchTbd({ home_team_code: 'TBD', away_team_code: 'TBD' })).toBe(true)
  })

  it('D.2.1 home TBD, away definido → true', () => {
    expect(isMatchTbd({ home_team_code: 'TBD', away_team_code: 'BRA' })).toBe(true)
  })

  it('D.2.1 away TBD, home definido → true', () => {
    expect(isMatchTbd({ home_team_code: 'BRA', away_team_code: 'TBD' })).toBe(true)
  })

  it('D.2.2 ambos definidos → false (fluxo normal)', () => {
    expect(isMatchTbd({ home_team_code: 'BRA', away_team_code: 'ARG' })).toBe(false)
  })
})

// ─── D.3 — newlyBothDefined (agrupamento por fase testado via lógica pura) ───

describe('computeTeamCodeChanges — D.3 newlyBothDefined', () => {
  it('apenas home saía de TBD + away já definido → newlyBothDefined true', () => {
    const { newlyBothDefined } = computeTeamCodeChanges(
      { ...tbdMatch, away_team_code: 'ARG', away_team_name: 'Argentina' },
      { tla: 'BRA', name: 'Brasil' },
      { tla: 'ARG', name: 'Argentina' },
    )
    expect(newlyBothDefined).toBe(true)
  })

  it('home TBD + API não traz home ainda → newlyBothDefined false', () => {
    const { newlyBothDefined } = computeTeamCodeChanges(
      { ...tbdMatch, away_team_code: 'ARG', away_team_name: 'Argentina' },
      { tla: null },
      { tla: 'ARG' },
    )
    expect(newlyBothDefined).toBe(false)
  })

  it('ambos já definidos antes → newlyBothDefined false', () => {
    const { newlyBothDefined } = computeTeamCodeChanges(
      definedMatch,
      { tla: 'BRA' },
      { tla: 'ARG' },
    )
    expect(newlyBothDefined).toBe(false)
  })

  it('2 jogos mesma fase: cada um gera newlyBothDefined true → agrupamento externo dá 1 entrada por fase', () => {
    const matchA = { ...tbdMatch, id: 1 }
    const matchB = { ...tbdMatch, id: 2 }
    const results = [matchA, matchB].map((m) =>
      computeTeamCodeChanges(m, { tla: 'BRA' }, { tla: 'ARG' }),
    )
    const newlyDefined = results.filter((r) => r.newlyBothDefined)
    expect(newlyDefined).toHaveLength(2)

    // Agrupamento por stage produziria 1 entry para 'r16'
    const byStage = new Map<string, number>()
    for (const m of [matchA, matchB]) {
      byStage.set(m.stage, (byStage.get(m.stage) ?? 0) + 1)
    }
    expect(byStage.size).toBe(1) // 1 fase → 1 notificação
    expect(byStage.get('r16')).toBe(2)
  })
})
