import { describe, it, expect } from 'vitest'
import { buildTournamentRankingEntries, getTournamentPhaseStatus } from '../ranking-tournament-builder'
import type { TournamentPred } from '../ranking-tournament-builder'
import type { PhaseUser } from '../ranking-phase-builder'

const u1: PhaseUser = { id: 1, telegram_id: 101, display_name: null, first_name: 'Alice', last_name: null, photo_url: null }
const u2: PhaseUser = { id: 2, telegram_id: 102, display_name: null, first_name: 'Bob',   last_name: null, photo_url: null }
const u3: PhaseUser = { id: 3, telegram_id: 103, display_name: null, first_name: 'Carol', last_name: null, photo_url: null }

const pred = (
  userId: number,
  points: number,
  closedAt: Date | null = null,
  computedAt: Date | null = null,
): TournamentPred => ({
  user_id: userId,
  points_awarded: points,
  closed_at: closedAt,
  computed_at: computedAt,
})

const t = (iso: string) => new Date(iso)

// ---------------------------------------------------------------------------
// getTournamentPhaseStatus
// ---------------------------------------------------------------------------

describe('getTournamentPhaseStatus', () => {
  it('not_started quando nenhum computed_at', () => {
    expect(getTournamentPhaseStatus([pred(1, 0), pred(2, 0)])).toBe('not_started')
  })

  it('closed quando ao menos 1 computed_at preenchido', () => {
    const preds: TournamentPred[] = [
      pred(1, 100, t('2026-07-15T10:00:00Z'), t('2026-07-15T10:01:00Z')),
      pred(2, 0),
    ]
    expect(getTournamentPhaseStatus(preds)).toBe('closed')
  })

  it('lista vazia → not_started', () => {
    expect(getTournamentPhaseStatus([])).toBe('not_started')
  })
})

// ---------------------------------------------------------------------------
// buildTournamentRankingEntries — ordenação
// ---------------------------------------------------------------------------

describe('buildTournamentRankingEntries — ordenação por pontos', () => {
  it('ordena por points DESC', () => {
    const preds = [
      pred(1, 50, t('2026-07-01T12:00:00Z')),
      pred(2, 80, t('2026-07-01T11:00:00Z')),
      pred(3, 30, t('2026-07-01T13:00:00Z')),
    ]
    const result = buildTournamentRankingEntries([u1, u2, u3], preds)
    expect(result[0].user_id).toBe(2) // 80 pts
    expect(result[1].user_id).toBe(1) // 50 pts
    expect(result[2].user_id).toBe(3) // 30 pts
  })

  it('posições atribuídas corretamente (1, 2, 3)', () => {
    const preds = [
      pred(1, 50, t('2026-07-01T12:00:00Z')),
      pred(2, 80, t('2026-07-01T11:00:00Z')),
      pred(3, 30, t('2026-07-01T13:00:00Z')),
    ]
    const result = buildTournamentRankingEntries([u1, u2, u3], preds)
    expect(result[0].position).toBe(1)
    expect(result[1].position).toBe(2)
    expect(result[2].position).toBe(3)
  })
})

describe('buildTournamentRankingEntries — tie-break por closed_at', () => {
  it('pontos iguais: quem palpitou primeiro fica na frente', () => {
    const preds = [
      pred(1, 50, t('2026-07-01T14:00:00Z')), // mais tarde
      pred(2, 50, t('2026-07-01T10:00:00Z')), // mais cedo → frente
    ]
    const result = buildTournamentRankingEntries([u1, u2], preds)
    expect(result[0].user_id).toBe(2)
    expect(result[1].user_id).toBe(1)
    expect(result[0].position).toBe(1)
    expect(result[1].position).toBe(2)
  })

  it('pontos iguais E closed_at igual → true tie (mesma posição)', () => {
    const same = t('2026-07-01T10:00:00Z')
    const preds = [
      pred(1, 50, same),
      pred(2, 50, same),
    ]
    const result = buildTournamentRankingEntries([u1, u2], preds)
    expect(result[0].position).toBe(1)
    expect(result[1].position).toBe(1)
  })

  it('nunca palpitou (closed_at null) → fica atrás de quem palpitou', () => {
    const preds = [
      pred(1, 0, null),        // sem palpite
      pred(2, 0, t('2026-07-01T10:00:00Z')), // com palpite
    ]
    const result = buildTournamentRankingEntries([u1, u2], preds)
    expect(result[0].user_id).toBe(2)
    expect(result[1].user_id).toBe(1)
    expect(result[0].position).toBe(1)
    expect(result[1].position).toBe(2)
  })

  it('tie-break final (telegram_id): mesmos pontos, mesmo closed_at → menor telegram_id na frente', () => {
    const same = t('2026-07-01T10:00:00Z')
    // telegram_id: u1=101, u2=102 → u1 primeiro
    const preds = [
      pred(2, 50, same),
      pred(1, 50, same),
    ]
    const result = buildTournamentRankingEntries([u1, u2], preds)
    expect(result[0].user_id).toBe(1) // telegram_id 101 < 102
    expect(result[1].user_id).toBe(2)
    // true tie: mesmos pontos + mesmo closed_at → mesma posição
    expect(result[0].position).toBe(1)
    expect(result[1].position).toBe(1)
  })
})

describe('buildTournamentRankingEntries — campos derivados', () => {
  it('total_points === tournament_points; match_points === 0', () => {
    const preds = [pred(1, 75, t('2026-07-01T10:00:00Z'))]
    const result = buildTournamentRankingEntries([u1], preds)
    expect(result[0].tournament_points).toBe(75)
    expect(result[0].total_points).toBe(75)
    expect(result[0].match_points).toBe(0)
  })

  it('exact_scores e winners_correct sempre 0', () => {
    const preds = [pred(1, 100, t('2026-07-01T10:00:00Z'))]
    const result = buildTournamentRankingEntries([u1], preds)
    expect(result[0].exact_scores).toBe(0)
    expect(result[0].winners_correct).toBe(0)
  })

  it('prev_position sempre null', () => {
    const preds = [pred(1, 50, t('2026-07-01T10:00:00Z'))]
    const result = buildTournamentRankingEntries([u1], preds)
    expect(result[0].prev_position).toBeNull()
  })

  it('usuário sem tournament_prediction → 0 pts', () => {
    const result = buildTournamentRankingEntries([u1, u2], [])
    expect(result.every((e) => e.total_points === 0)).toBe(true)
  })
})

describe('buildTournamentRankingEntries — hoje (tudo zerado)', () => {
  it('todos com 0 pts → todos na posição 1 (true tie)', () => {
    const preds = [pred(1, 0, null), pred(2, 0, null), pred(3, 0, null)]
    const result = buildTournamentRankingEntries([u1, u2, u3], preds)
    expect(result.every((e) => e.position === 1)).toBe(true)
  })

  it('true tie no topo: próxima posição pula para N+1', () => {
    const same = t('2026-07-01T10:00:00Z')
    const preds = [
      pred(1, 50, same),
      pred(2, 50, same),
      pred(3, 30, t('2026-07-01T11:00:00Z')),
    ]
    const result = buildTournamentRankingEntries([u1, u2, u3], preds)
    const carol = result.find((e) => e.user_id === 3)!
    expect(carol.position).toBe(3) // não 2
  })
})
