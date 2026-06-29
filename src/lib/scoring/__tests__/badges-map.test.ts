import { describe, it, expect } from 'vitest'
import { computeBadgeMap, computeChampionsMap } from '../badges-pure'

// ---------------------------------------------------------------------------
// computeBadgeMap
// ---------------------------------------------------------------------------

describe('computeBadgeMap', () => {
  it('retorna mapa vazio quando todos os rankings estão vazios', () => {
    const map = computeBadgeMap([], [], [], [])
    expect(map.size).toBe(0)
  })

  it('não atribui badge para posições > 1', () => {
    const ranking = [
      { user_id: 1, position: 2 },
      { user_id: 2, position: 3 },
    ]
    const map = computeBadgeMap(ranking, [], [], [])
    expect(map.size).toBe(0)
  })

  it('atribui champion_group para position === 1 no groupRanking', () => {
    const ranking = [
      { user_id: 10, position: 1 },
      { user_id: 11, position: 2 },
    ]
    const map = computeBadgeMap(ranking, [], [], [])
    expect(map.get(10)).toEqual(['champion_group'])
    expect(map.has(11)).toBe(false)
  })

  it('atribui champion_knockout para position === 1 no knockoutRanking', () => {
    const map = computeBadgeMap([], [{ user_id: 5, position: 1 }], [], [])
    expect(map.get(5)).toEqual(['champion_knockout'])
  })

  it('atribui champion_overall para position === 1 no overallRanking', () => {
    const map = computeBadgeMap([], [], [{ user_id: 7, position: 1 }], [])
    expect(map.get(7)).toEqual(['champion_overall'])
  })

  it('atribui champion_brazil para position === 1 no brazilRanking', () => {
    const map = computeBadgeMap([], [], [], [{ user_id: 3, position: 1 }])
    expect(map.get(3)).toEqual(['champion_brazil'])
  })

  it('usuário pode acumular vários badges', () => {
    const entry = { user_id: 42, position: 1 }
    const map = computeBadgeMap([entry], [entry], [entry], [entry])
    expect(map.get(42)).toEqual([
      'champion_group',
      'champion_knockout',
      'champion_overall',
      'champion_brazil',
    ])
  })

  it('múltiplos campeões empatados na posição 1', () => {
    const group = [
      { user_id: 1, position: 1 },
      { user_id: 2, position: 1 },
    ]
    const map = computeBadgeMap(group, [], [], [])
    expect(map.get(1)).toEqual(['champion_group'])
    expect(map.get(2)).toEqual(['champion_group'])
  })

  it('dois usuários com badges distintos em rankings diferentes', () => {
    const map = computeBadgeMap(
      [{ user_id: 1, position: 1 }],
      [{ user_id: 2, position: 1 }],
      [],
      [],
    )
    expect(map.get(1)).toEqual(['champion_group'])
    expect(map.get(2)).toEqual(['champion_knockout'])
  })
})

// ---------------------------------------------------------------------------
// computeChampionsMap
// ---------------------------------------------------------------------------

const OPEN: 'not_started' = 'not_started'
const CLOSED: 'closed' = 'closed'

const e1 = { position: 1, name: 'Alice', total_points: 100 }
const e2 = { position: 1, name: 'Bob',   total_points: 100 }
const e3 = { position: 2, name: 'Carol', total_points:  80 }

describe('computeChampionsMap', () => {
  it('retorna tudo null quando nenhuma fase fechou', () => {
    const result = computeChampionsMap(
      OPEN, OPEN, false, false, OPEN,
      [], [], [], [], [],
    )
    expect(result).toEqual({ overall: null, group: null, knockout: null, brazil: null, tournament: null })
  })

  it('group fecha → retorna champions do grupo', () => {
    const result = computeChampionsMap(
      CLOSED, OPEN, false, false, OPEN,
      [e1], [], [], [], [],
    )
    expect(result.group).toEqual([{ name: 'Alice', total_points: 100 }])
    expect(result.knockout).toBeNull()
    expect(result.overall).toBeNull()
    expect(result.brazil).toBeNull()
    expect(result.tournament).toBeNull()
  })

  it('knockout fecha → retorna champions do mata-mata', () => {
    const result = computeChampionsMap(
      OPEN, CLOSED, false, false, OPEN,
      [], [e1], [], [], [],
    )
    expect(result.knockout).toEqual([{ name: 'Alice', total_points: 100 }])
    expect(result.group).toBeNull()
  })

  it('finalLocked → retorna champions overall', () => {
    const result = computeChampionsMap(
      OPEN, OPEN, true, false, OPEN,
      [], [], [e1], [], [],
    )
    expect(result.overall).toEqual([{ name: 'Alice', total_points: 100 }])
  })

  it('brazilEliminated → retorna champions brazil', () => {
    const result = computeChampionsMap(
      OPEN, OPEN, false, true, OPEN,
      [], [], [], [e1], [],
    )
    expect(result.brazil).toEqual([{ name: 'Alice', total_points: 100 }])
  })

  it('tournament closed → retorna champions do torneio', () => {
    const result = computeChampionsMap(
      OPEN, OPEN, false, false, CLOSED,
      [], [], [], [], [e1],
    )
    expect(result.tournament).toEqual([{ name: 'Alice', total_points: 100 }])
  })

  it('ignora entradas com position !== 1 no ranking', () => {
    const result = computeChampionsMap(
      CLOSED, OPEN, false, false, OPEN,
      [e3], [], [], [], [],
    )
    expect(result.group).toEqual([])
  })

  it('múltiplos empatados retornam todos na lista', () => {
    const result = computeChampionsMap(
      CLOSED, OPEN, false, false, OPEN,
      [e1, e2], [], [], [], [],
    )
    expect(result.group).toEqual([
      { name: 'Alice', total_points: 100 },
      { name: 'Bob',   total_points: 100 },
    ])
  })

  it('todas as fases fechadas → todas as entradas preenchidas', () => {
    const result = computeChampionsMap(
      CLOSED, CLOSED, true, true, CLOSED,
      [e1], [e1], [e1], [e1], [e1],
    )
    expect(result.group).not.toBeNull()
    expect(result.knockout).not.toBeNull()
    expect(result.overall).not.toBeNull()
    expect(result.brazil).not.toBeNull()
    expect(result.tournament).not.toBeNull()
  })
})
