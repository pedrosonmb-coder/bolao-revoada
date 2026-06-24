import { describe, it, expect } from 'vitest'
import { computeBadgesFromData } from '../badges-pure'
import type { BadgeCriteria } from '../badges-pure'

const closed = 'closed' as const
const inProgress = 'in_progress' as const
const notStarted = 'not_started' as const

const u1 = { user_id: 1, position: 1 }
const u2 = { user_id: 2, position: 2 }
const u1tied = { user_id: 1, position: 1 }
const u2tied = { user_id: 2, position: 1 }

function base(overrides: Partial<BadgeCriteria> = {}): BadgeCriteria {
  return {
    userId: 1,
    groupStatus: notStarted,
    knockoutStatus: notStarted,
    finalLocked: false,
    brazilEliminated: false,
    groupRanking: [],
    knockoutRanking: [],
    overallRanking: [],
    brazilRanking: [],
    ...overrides,
  }
}

describe('computeBadgesFromData — champion_group', () => {
  it('fase não fechada → sem selo', () => {
    const result = computeBadgesFromData(base({
      groupStatus: inProgress,
      groupRanking: [u1],
    }))
    expect(result.find((b) => b.id === 'champion_group')).toBeUndefined()
  })

  it('fase fechada mas usuário não é campeão → sem selo', () => {
    const result = computeBadgesFromData(base({
      groupStatus: closed,
      groupRanking: [u2, { user_id: 1, position: 2 }],
    }))
    expect(result.find((b) => b.id === 'champion_group')).toBeUndefined()
  })

  it('fase fechada e usuário é campeão → selo incluído', () => {
    const result = computeBadgesFromData(base({
      groupStatus: closed,
      groupRanking: [u1, u2],
    }))
    const badge = result.find((b) => b.id === 'champion_group')
    expect(badge).toBeDefined()
    expect(badge!.label).toBe('Campeão dos Grupos')
  })

  it('empate: ambos na position 1 → ambos recebem o selo', () => {
    const resultU1 = computeBadgesFromData(base({
      userId: 1,
      groupStatus: closed,
      groupRanking: [u1tied, u2tied],
    }))
    const resultU2 = computeBadgesFromData(base({
      userId: 2,
      groupStatus: closed,
      groupRanking: [u1tied, u2tied],
    }))
    expect(resultU1.find((b) => b.id === 'champion_group')).toBeDefined()
    expect(resultU2.find((b) => b.id === 'champion_group')).toBeDefined()
  })
})

describe('computeBadgesFromData — champion_knockout', () => {
  it('fase não fechada → sem selo', () => {
    const result = computeBadgesFromData(base({
      knockoutStatus: inProgress,
      knockoutRanking: [u1],
    }))
    expect(result.find((b) => b.id === 'champion_knockout')).toBeUndefined()
  })

  it('fase fechada e campeão → selo com label correto', () => {
    const result = computeBadgesFromData(base({
      knockoutStatus: closed,
      knockoutRanking: [u1, u2],
    }))
    const badge = result.find((b) => b.id === 'champion_knockout')
    expect(badge).toBeDefined()
    expect(badge!.label).toBe('Campeão do Mata-mata')
  })
})

describe('computeBadgesFromData — champion_overall', () => {
  it('final não travada → sem selo', () => {
    const result = computeBadgesFromData(base({
      finalLocked: false,
      overallRanking: [u1],
    }))
    expect(result.find((b) => b.id === 'champion_overall')).toBeUndefined()
  })

  it('final travada e campeão → selo com label correto', () => {
    const result = computeBadgesFromData(base({
      finalLocked: true,
      overallRanking: [u1, u2],
    }))
    const badge = result.find((b) => b.id === 'champion_overall')
    expect(badge).toBeDefined()
    expect(badge!.label).toBe('Campeão Geral')
  })

  it('final travada mas usuário não é campeão → sem selo', () => {
    const result = computeBadgesFromData(base({
      finalLocked: true,
      overallRanking: [u2, { user_id: 1, position: 2 }],
    }))
    expect(result.find((b) => b.id === 'champion_overall')).toBeUndefined()
  })
})

describe('computeBadgesFromData — champion_brazil', () => {
  it('Brasil não saiu → sem selo', () => {
    const result = computeBadgesFromData(base({
      brazilEliminated: false,
      brazilRanking: [u1],
    }))
    expect(result.find((b) => b.id === 'champion_brazil')).toBeUndefined()
  })

  it('Brasil saiu e campeão → selo com label correto', () => {
    const result = computeBadgesFromData(base({
      brazilEliminated: true,
      brazilRanking: [u1, u2],
    }))
    const badge = result.find((b) => b.id === 'champion_brazil')
    expect(badge).toBeDefined()
    expect(badge!.label).toBe('Campeão do Brasil')
  })

  it('empate no Brasil → ambos recebem o selo', () => {
    const resultU2 = computeBadgesFromData(base({
      userId: 2,
      brazilEliminated: true,
      brazilRanking: [u1tied, u2tied],
    }))
    expect(resultU2.find((b) => b.id === 'champion_brazil')).toBeDefined()
  })
})

describe('computeBadgesFromData — cenários compostos', () => {
  it('nada fechado → nenhum selo', () => {
    const result = computeBadgesFromData(base())
    expect(result).toHaveLength(0)
  })

  it('tudo fechado e usuário é campeão de tudo → 4 selos', () => {
    const result = computeBadgesFromData(base({
      groupStatus: closed,
      knockoutStatus: closed,
      finalLocked: true,
      brazilEliminated: true,
      groupRanking: [u1],
      knockoutRanking: [u1],
      overallRanking: [u1],
      brazilRanking: [u1],
    }))
    expect(result).toHaveLength(4)
    const ids = result.map((b) => b.id)
    expect(ids).toContain('champion_group')
    expect(ids).toContain('champion_knockout')
    expect(ids).toContain('champion_overall')
    expect(ids).toContain('champion_brazil')
  })

  it('campeão dos grupos mas não do mata-mata', () => {
    const result = computeBadgesFromData(base({
      groupStatus: closed,
      knockoutStatus: closed,
      groupRanking: [u1, u2],
      knockoutRanking: [u2, { user_id: 1, position: 2 }],
    }))
    const ids = result.map((b) => b.id)
    expect(ids).toContain('champion_group')
    expect(ids).not.toContain('champion_knockout')
  })
})
