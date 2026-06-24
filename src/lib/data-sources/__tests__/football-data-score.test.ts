import { describe, it, expect, vi } from 'vitest'
import { parseScoreFromPayload } from '../football-data'

// parseScoreFromPayload is a pure function — no network, no env needed
vi.mock('@/lib/env', () => ({ env: { FOOTBALL_DATA_API_KEY: 'test' } }))

describe('parseScoreFromPayload — FURO 3', () => {
  it('REGULAR duration → usa fullTime', () => {
    const r = parseScoreFromPayload({
      duration: 'REGULAR',
      fullTime: { home: 2, away: 1 },
      extraTime: null,
      penalties: null,
    })
    expect(r.home_score).toBe(2)
    expect(r.away_score).toBe(1)
    expect(r.home_score_pen).toBeNull()
    expect(r.away_score_pen).toBeNull()
  })

  it('EXTRA_TIME → usa extraTime, ignora fullTime de 90min', () => {
    const r = parseScoreFromPayload({
      duration: 'EXTRA_TIME',
      fullTime: { home: 1, away: 1 },
      extraTime: { home: 2, away: 1 },
      penalties: null,
    })
    expect(r.home_score).toBe(2)
    expect(r.away_score).toBe(1)
    expect(r.home_score_pen).toBeNull()
    expect(r.away_score_pen).toBeNull()
  })

  it('PENALTY_SHOOTOUT → usa extraTime para placar + penalties para pênaltis', () => {
    const r = parseScoreFromPayload({
      duration: 'PENALTY_SHOOTOUT',
      fullTime: { home: 1, away: 1 },
      extraTime: { home: 1, away: 1 },
      penalties: { home: 5, away: 4 },
    })
    expect(r.home_score).toBe(1)
    expect(r.away_score).toBe(1)
    expect(r.home_score_pen).toBe(5)
    expect(r.away_score_pen).toBe(4)
  })

  it('EXTRA_TIME com extraTime null → fallback para fullTime (com warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const r = parseScoreFromPayload({
      duration: 'EXTRA_TIME',
      fullTime: { home: 3, away: 2 },
      extraTime: null,
      penalties: null,
    })
    expect(r.home_score).toBe(3)
    expect(r.away_score).toBe(2)
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('sem duration (null) → usa fullTime', () => {
    const r = parseScoreFromPayload({
      fullTime: { home: 0, away: 0 },
    })
    expect(r.home_score).toBe(0)
    expect(r.away_score).toBe(0)
  })

  it('score vazio → todos null', () => {
    const r = parseScoreFromPayload({})
    expect(r.home_score).toBeNull()
    expect(r.away_score).toBeNull()
    expect(r.home_score_pen).toBeNull()
    expect(r.away_score_pen).toBeNull()
  })

  it('PENALTY_SHOOTOUT com extraTime parcialmente null → fallback fullTime', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const r = parseScoreFromPayload({
      duration: 'PENALTY_SHOOTOUT',
      fullTime: { home: 2, away: 2 },
      extraTime: { home: null, away: null },
      penalties: { home: 4, away: 3 },
    })
    expect(r.home_score).toBe(2)
    expect(r.away_score).toBe(2)
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})
