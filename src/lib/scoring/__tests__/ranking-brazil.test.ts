import { describe, it, expect } from 'vitest'
import { buildBrazilRankingEntries } from '../ranking-brazil-builder'
import type { PhaseUser, PhasePred } from '../ranking-phase-builder'

const u1: PhaseUser = { id: 1, telegram_id: 101, display_name: null, first_name: 'Alice', last_name: null, photo_url: null }
const u2: PhaseUser = { id: 2, telegram_id: 102, display_name: null, first_name: 'Bob',   last_name: null, photo_url: null }
const u3: PhaseUser = { id: 3, telegram_id: 103, display_name: null, first_name: 'Carol', last_name: null, photo_url: null }

const brazilIds = (...ids: number[]) => new Set(ids)

describe('buildBrazilRankingEntries — filtragem por match ID', () => {
  it('só soma predições cujo match_id está no set de jogos do Brasil', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 }, // Brasil ← conta
      { user_id: 1, match_id: 2, points_awarded: 50, base_points: 25 }, // outro ← ignorado
      { user_id: 2, match_id: 1, points_awarded: 18, base_points: 18 }, // Brasil ← conta
    ]
    const result = buildBrazilRankingEntries([u1, u2], preds, brazilIds(1))

    const alice = result.find((e) => e.user_id === 1)!
    const bob   = result.find((e) => e.user_id === 2)!
    expect(alice.total_points).toBe(25) // 50 do jogo não-Brasil não entra
    expect(bob.total_points).toBe(18)
  })

  it('set vazio → todos com 0 pontos', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 },
    ]
    const result = buildBrazilRankingEntries([u1, u2], preds, brazilIds())
    expect(result.every((e) => e.total_points === 0)).toBe(true)
  })

  it('tournament_points sempre 0', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 30, base_points: 25 },
    ]
    const result = buildBrazilRankingEntries([u1], preds, brazilIds(1))
    expect(result[0].tournament_points).toBe(0)
  })

  it('usuário sem predições em jogos do Brasil → 0 pts, posição válida', () => {
    const preds: PhasePred[] = [
      { user_id: 2, match_id: 1, points_awarded: 18, base_points: 18 },
    ]
    const result = buildBrazilRankingEntries([u1, u2], preds, brazilIds(1))
    const alice = result.find((e) => e.user_id === 1)!
    expect(alice.total_points).toBe(0)
    expect(alice.position).toBeGreaterThan(0)
  })
})

describe('buildBrazilRankingEntries — ordenação e posições', () => {
  it('ordena por total_points DESC', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 10, base_points: 10 },
      { user_id: 2, match_id: 2, points_awarded: 25, base_points: 25 },
      { user_id: 3, match_id: 3, points_awarded: 18, base_points: 18 },
    ]
    const result = buildBrazilRankingEntries([u1, u2, u3], preds, brazilIds(1, 2, 3))
    expect(result[0].user_id).toBe(2)
    expect(result[1].user_id).toBe(3)
    expect(result[2].user_id).toBe(1)
    expect(result[0].position).toBe(1)
    expect(result[1].position).toBe(2)
    expect(result[2].position).toBe(3)
  })

  it('tie-break: pontos iguais → mais exact_scores na frente', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 18 }, // não exato
      { user_id: 2, match_id: 2, points_awarded: 25, base_points: 25 }, // exato
    ]
    const result = buildBrazilRankingEntries([u1, u2], preds, brazilIds(1, 2))
    expect(result[0].user_id).toBe(2) // mais exact_scores
    expect(result[0].position).toBe(1)
    expect(result[1].position).toBe(2)
  })

  it('tie-break final: telegram_id menor na frente (determinístico)', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 },
      { user_id: 2, match_id: 2, points_awarded: 25, base_points: 25 },
    ]
    const result = buildBrazilRankingEntries([u1, u2], preds, brazilIds(1, 2))
    // u1 telegram_id=101 < u2 telegram_id=102
    expect(result[0].user_id).toBe(1)
  })

  it('true tie: mesma posição quando pontos e exact_scores são iguais', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 },
      { user_id: 2, match_id: 2, points_awarded: 25, base_points: 25 },
    ]
    const result = buildBrazilRankingEntries([u1, u2], preds, brazilIds(1, 2))
    expect(result[0].position).toBe(1)
    expect(result[1].position).toBe(1)
  })

  it('true tie no topo: posição seguinte é 3 (não 2)', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 },
      { user_id: 2, match_id: 2, points_awarded: 25, base_points: 25 },
      { user_id: 3, match_id: 3, points_awarded: 10, base_points: 10 },
    ]
    const result = buildBrazilRankingEntries([u1, u2, u3], preds, brazilIds(1, 2, 3))
    expect(result[0].position).toBe(1)
    expect(result[1].position).toBe(1)
    expect(result[2].position).toBe(3)
  })
})

describe('buildBrazilRankingEntries — campos derivados', () => {
  it('exact_scores conta só base_points=25 nos jogos do Brasil', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 }, // Brasil, exato
      { user_id: 1, match_id: 2, points_awarded: 50, base_points: 25 }, // não-Brasil ← ignorado
      { user_id: 1, match_id: 3, points_awarded: 18, base_points: 18 }, // Brasil, não exato
    ]
    const result = buildBrazilRankingEntries([u1], preds, brazilIds(1, 3))
    expect(result[0].exact_scores).toBe(1)
  })

  it('prev_position sempre null', () => {
    const preds: PhasePred[] = [
      { user_id: 1, match_id: 1, points_awarded: 25, base_points: 25 },
    ]
    const result = buildBrazilRankingEntries([u1], preds, brazilIds(1))
    expect(result[0].prev_position).toBeNull()
  })
})
