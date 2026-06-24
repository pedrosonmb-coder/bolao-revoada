import { describe, it, expect } from 'vitest'
import { buildPhaseRankingEntries } from '../ranking-phase-builder'
import type { PhaseUser, PhasePred } from '../ranking-phase-builder'

const u1: PhaseUser = { id: 1, telegram_id: 101, display_name: null, first_name: 'Alice', last_name: null, photo_url: null }
const u2: PhaseUser = { id: 2, telegram_id: 102, display_name: null, first_name: 'Bob',   last_name: null, photo_url: null }
const u3: PhaseUser = { id: 3, telegram_id: 103, display_name: null, first_name: 'Carol', last_name: null, photo_url: null }

const stageMap = (entries: [number, string][]) => new Map(entries)

describe('buildPhaseRankingEntries — filtragem por fase', () => {
  it('getRanking([group]): só soma predições cujo match é "group"', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 }, // group ← conta
      { user_id: 1, match_id: 2, points_awarded: 50, base_points: 25 }, // qf ← ignorado
      { user_id: 2, match_id: 1, points_awarded: 18, base_points: 18 }, // group ← conta
    ]
    const map = stageMap([[1, 'group'], [2, 'qf']])
    const result = buildPhaseRankingEntries([u1, u2], preds, map, ['group'])

    const alice = result.find((e) => e.user_id === 1)!
    const bob   = result.find((e) => e.user_id === 2)!

    expect(alice.total_points).toBe(25) // 50 do qf não conta
    expect(bob.total_points).toBe(18)
  })

  it('tournament_points sempre 0 no ranking por fase', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 },
    ]
    const result = buildPhaseRankingEntries([u1], preds, stageMap([[1, 'group']]), ['group'])
    expect(result[0].tournament_points).toBe(0)
  })

  it('getRanking([qf]) sem nenhum match de qf → todos zerados', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 }, // group
      { user_id: 2, match_id: 1, points_awarded: 18, base_points: 18 }, // group
    ]
    const result = buildPhaseRankingEntries([u1, u2], preds, stageMap([[1, 'group']]), ['qf'])
    expect(result.every((e) => e.total_points === 0)).toBe(true)
  })

  it('mata-mata bloco: aceita múltiplos stages, ignora group', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 }, // group ← ignorado
      { user_id: 1, match_id: 2, points_awarded: 50, base_points: 25 }, // qf ← conta
      { user_id: 2, match_id: 3, points_awarded: 40, base_points: 18 }, // r32 ← conta
    ]
    const map = stageMap([[1, 'group'], [2, 'qf'], [3, 'r32']])
    const knockout = ['r32', 'r16', 'qf', 'sf', '3rd', 'final']
    const result = buildPhaseRankingEntries([u1, u2], preds, map, knockout)

    const alice = result.find((e) => e.user_id === 1)!
    const bob   = result.find((e) => e.user_id === 2)!
    expect(alice.total_points).toBe(50)
    expect(bob.total_points).toBe(40)
  })
})

describe('buildPhaseRankingEntries — ordenação e posições', () => {
  it('ordenação por total_points DESC', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 10, base_points: 10 },
      { user_id: 2, match_id: 2, points_awarded: 25, base_points: 25 },
      { user_id: 3, match_id: 3, points_awarded: 18, base_points: 18 },
    ]
    const map = stageMap([[1, 'group'], [2, 'group'], [3, 'group']])
    const result = buildPhaseRankingEntries([u1, u2, u3], preds, map, ['group'])

    expect(result[0].user_id).toBe(2) // 25
    expect(result[1].user_id).toBe(3) // 18
    expect(result[2].user_id).toBe(1) // 10
    expect(result[0].position).toBe(1)
    expect(result[1].position).toBe(2)
    expect(result[2].position).toBe(3)
  })

  it('tie-break: pontos iguais → mais exact_scores na frente', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 }, // exato
      { user_id: 2, match_id: 2, points_awarded: 25, base_points: 18 }, // não exato
    ]
    const map = stageMap([[1, 'group'], [2, 'group']])
    const result = buildPhaseRankingEntries([u1, u2], preds, map, ['group'])

    expect(result[0].user_id).toBe(1) // mais exatos
    expect(result[0].position).toBe(1)
    expect(result[1].position).toBe(2)
  })

  it('tie-break: pontos e exatos iguais → telegram_id menor na frente (determinístico)', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 },
      { user_id: 2, match_id: 2, points_awarded: 25, base_points: 25 },
    ]
    const map = stageMap([[1, 'group'], [2, 'group']])
    const result = buildPhaseRankingEntries([u1, u2], preds, map, ['group'])

    // u1 tem telegram_id=101 < u2 telegram_id=102 → u1 na frente
    expect(result[0].user_id).toBe(1)
  })

  it('true tie: mesma posição quando pontos e exact_scores são iguais', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 },
      { user_id: 2, match_id: 2, points_awarded: 25, base_points: 25 },
    ]
    const map = stageMap([[1, 'group'], [2, 'group']])
    const result = buildPhaseRankingEntries([u1, u2], preds, map, ['group'])

    expect(result[0].position).toBe(1)
    expect(result[1].position).toBe(1)
  })

  it('true tie no topo: posição seguinte é 3 (não 2)', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 },
      { user_id: 2, match_id: 2, points_awarded: 25, base_points: 25 },
      { user_id: 3, match_id: 3, points_awarded: 10, base_points: 10 },
    ]
    const map = stageMap([[1, 'group'], [2, 'group'], [3, 'group']])
    const result = buildPhaseRankingEntries([u1, u2, u3], preds, map, ['group'])

    expect(result[0].position).toBe(1)
    expect(result[1].position).toBe(1)
    expect(result[2].position).toBe(3)
  })

  it('prev_position é sempre null no ranking por fase', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 },
    ]
    const result = buildPhaseRankingEntries([u1], preds, stageMap([[1, 'group']]), ['group'])
    expect(result[0].prev_position).toBeNull()
  })
})

describe('buildPhaseRankingEntries — campos derivados', () => {
  it('exact_scores conta só base_points=25 nos stages filtrados', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 }, // group, exato
      { user_id: 1, match_id: 2, points_awarded: 50, base_points: 25 }, // qf, exato — ignorado
      { user_id: 1, match_id: 3, points_awarded: 18, base_points: 18 }, // group, não exato
    ]
    const map = stageMap([[1, 'group'], [2, 'qf'], [3, 'group']])
    const result = buildPhaseRankingEntries([u1], preds, map, ['group'])

    expect(result[0].exact_scores).toBe(1) // só match_id=1 conta
  })

  it('winners_correct: base_points >= 10 nos stages filtrados', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 10, base_points: 10 },
      { user_id: 1, match_id: 2, points_awarded: 0,  base_points: 0  },
    ]
    const map = stageMap([[1, 'group'], [2, 'group']])
    const result = buildPhaseRankingEntries([u1], preds, map, ['group'])

    expect(result[0].winners_correct).toBe(1)
  })

  it('usuário sem predições nessa fase → 0 pontos, posição válida', () => {
    const preds: PhasePred[] = [
      { user_id: 2, match_id: 1, points_awarded: 18, base_points: 18 },
    ]
    const result = buildPhaseRankingEntries([u1, u2], preds, stageMap([[1, 'group']]), ['group'])
    const alice = result.find((e) => e.user_id === 1)!
    expect(alice.total_points).toBe(0)
    expect(alice.position).toBeGreaterThan(0)
  })
})
