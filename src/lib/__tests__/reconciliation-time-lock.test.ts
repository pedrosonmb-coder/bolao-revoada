import { describe, it, expect } from 'vitest'
import { computeTimeLockDecision, computeLockDecision, TIME_LOCK_KICKOFF_HOURS, TIME_LOCK_STABILITY_MINUTES, LOCK_THRESHOLD_FLOOR } from '../reconciliation-lock'

// Builds a sequence of N identical snapshots spanning `spanMinutes` minutes,
// ending at `endTime`. Descending order (most recent first), matching the DB query.
function stableSnaps(
  count: number,
  home: number,
  away: number,
  spanMinutes: number,
  endTime: Date,
  home_pen: number | null = null,
  away_pen: number | null = null,
) {
  return Array.from({ length: count }, (_, i) => {
    const offset = i === 0 ? 0 : Math.round((spanMinutes / (count - 1)) * i * 60 * 1000)
    return {
      home_score: home,
      away_score: away,
      home_score_pen: home_pen,
      away_score_pen: away_pen,
      fetched_at: new Date(endTime.getTime() - offset),
    }
  })
}

const NOW = new Date('2026-06-23T01:30:00Z')

// Kickoffs relative to NOW
const KICKOFF_4H_AGO  = new Date(NOW.getTime() - 4 * 60 * 60 * 1000)  // 4h before → ✓ threshold
const KICKOFF_2H_AGO  = new Date(NOW.getTime() - 2 * 60 * 60 * 1000)  // 2h before → ✗ threshold
const KICKOFF_215_AGO = new Date(NOW.getTime() - 2.25 * 60 * 60 * 1000) // 2h15m → ✗ threshold

// ─────────────────────────────────────────────────────────────────────────────
// 1. FRA x IRQ — travamento correto
// ─────────────────────────────────────────────────────────────────────────────
describe('computeTimeLockDecision — FRA x IRQ (deve travar)', () => {
  it('3-0 estável por 33min, kickoff 4h atrás → trava com score correto', () => {
    const result = computeTimeLockDecision({
      kickoffAt: KICKOFF_4H_AGO,
      now: NOW,
      recentNonNullSnapshots: stableSnaps(10, 3, 0, 33, NOW),
    })
    expect(result.shouldLock).toBe(true)
    if (result.shouldLock) {
      expect(result.lockScore).toEqual({ home: 3, away: 0, home_pen: null, away_pen: null })
    }
  })

  it('3 snapshots (floor exato) estáveis por 30min → trava', () => {
    const result = computeTimeLockDecision({
      kickoffAt: KICKOFF_4H_AGO,
      now: NOW,
      recentNonNullSnapshots: stableSnaps(3, 3, 0, 30, NOW),
    })
    expect(result.shouldLock).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. ESP x KSA — score errado (5-0), kickoff muito recente → NÃO trava
// ─────────────────────────────────────────────────────────────────────────────
describe('computeTimeLockDecision — ESP x KSA 5-0 (NÃO deve travar)', () => {
  it('5-0 por 12min, kickoff 2h15m atrás (< 3h) → não trava (kickoff_too_recent)', () => {
    const result = computeTimeLockDecision({
      kickoffAt: KICKOFF_215_AGO,
      now: NOW,
      recentNonNullSnapshots: stableSnaps(4, 5, 0, 12, NOW),
    })
    expect(result.shouldLock).toBe(false)
    if (!result.shouldLock) expect(result.reason).toBe('kickoff_too_recent')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. ESP x KSA — score correto (4-0) mas kickoff ainda < 3h → NÃO trava
// ─────────────────────────────────────────────────────────────────────────────
describe('computeTimeLockDecision — ESP x KSA 4-0 (NÃO deve travar)', () => {
  it('4-0 por 42min, kickoff 2h atrás (< 3h) → não trava (kickoff_too_recent)', () => {
    const result = computeTimeLockDecision({
      kickoffAt: KICKOFF_2H_AGO,
      now: NOW,
      recentNonNullSnapshots: stableSnaps(14, 4, 0, 42, NOW),
    })
    expect(result.shouldLock).toBe(false)
    if (!result.shouldLock) expect(result.reason).toBe('kickoff_too_recent')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Pênaltis instáveis (pen mudando) → NÃO trava
// ─────────────────────────────────────────────────────────────────────────────
describe('computeTimeLockDecision — pênaltis instáveis (NÃO deve travar)', () => {
  it('score 0-0 mas pen diverge (2-2 depois 1-1) → não trava (score_unstable)', () => {
    const result = computeTimeLockDecision({
      kickoffAt: KICKOFF_4H_AGO,
      now: NOW,
      recentNonNullSnapshots: [
        { home_score: 0, away_score: 0, home_score_pen: 2, away_score_pen: 2, fetched_at: NOW },
        { home_score: 0, away_score: 0, home_score_pen: 2, away_score_pen: 2, fetched_at: new Date(NOW.getTime() - 15 * 60 * 1000) },
        { home_score: 0, away_score: 0, home_score_pen: 1, away_score_pen: 1, fetched_at: new Date(NOW.getTime() - 30 * 60 * 1000) },
        { home_score: 0, away_score: 0, home_score_pen: 1, away_score_pen: 1, fetched_at: new Date(NOW.getTime() - 45 * 60 * 1000) },
      ],
    })
    expect(result.shouldLock).toBe(false)
    if (!result.shouldLock) expect(result.reason).toBe('score_unstable')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. Pênaltis estáveis → trava com pen correto
// ─────────────────────────────────────────────────────────────────────────────
describe('computeTimeLockDecision — pênaltis estáveis (deve travar)', () => {
  it('1-1 pen=4-3 estável por 35min, kickoff 4h atrás → trava com pen', () => {
    const result = computeTimeLockDecision({
      kickoffAt: KICKOFF_4H_AGO,
      now: NOW,
      recentNonNullSnapshots: stableSnaps(10, 1, 1, 35, NOW, 4, 3),
    })
    expect(result.shouldLock).toBe(true)
    if (result.shouldLock) {
      expect(result.lockScore).toEqual({ home: 1, away: 1, home_pen: 4, away_pen: 3 })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Poucos snapshots → NÃO trava
// ─────────────────────────────────────────────────────────────────────────────
describe('computeTimeLockDecision — snapshots insuficientes (NÃO deve travar)', () => {
  it('2 snapshots (abaixo do floor 3) → não trava (insufficient_snapshots)', () => {
    const result = computeTimeLockDecision({
      kickoffAt: KICKOFF_4H_AGO,
      now: NOW,
      recentNonNullSnapshots: stableSnaps(2, 2, 0, 40, NOW),
    })
    expect(result.shouldLock).toBe(false)
    if (!result.shouldLock) expect(result.reason).toBe('insufficient_snapshots')
  })

  it('lista vazia → não trava (insufficient_snapshots)', () => {
    const result = computeTimeLockDecision({
      kickoffAt: KICKOFF_4H_AGO,
      now: NOW,
      recentNonNullSnapshots: [],
    })
    expect(result.shouldLock).toBe(false)
    if (!result.shouldLock) expect(result.reason).toBe('insufficient_snapshots')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. Span insuficiente → NÃO trava
// ─────────────────────────────────────────────────────────────────────────────
describe('computeTimeLockDecision — span de tempo insuficiente (NÃO deve travar)', () => {
  it('10 snapshots estáveis mas span de 29min (< 30min) → não trava (span_too_short)', () => {
    const result = computeTimeLockDecision({
      kickoffAt: KICKOFF_4H_AGO,
      now: NOW,
      recentNonNullSnapshots: stableSnaps(10, 2, 1, 29, NOW),
    })
    expect(result.shouldLock).toBe(false)
    if (!result.shouldLock) expect(result.reason).toBe('span_too_short')
  })

  it('span exato de 30min → trava (boundary incluso)', () => {
    const result = computeTimeLockDecision({
      kickoffAt: KICKOFF_4H_AGO,
      now: NOW,
      recentNonNullSnapshots: stableSnaps(10, 2, 1, 30, NOW),
    })
    expect(result.shouldLock).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. Score divergente (VAR mid-match) → NÃO trava
// ─────────────────────────────────────────────────────────────────────────────
describe('computeTimeLockDecision — score divergente (NÃO deve travar)', () => {
  it('maioria com 3-0 mas um snap com 2-0 → não trava (score_unstable)', () => {
    const result = computeTimeLockDecision({
      kickoffAt: KICKOFF_4H_AGO,
      now: NOW,
      recentNonNullSnapshots: [
        { home_score: 3, away_score: 0, home_score_pen: null, away_score_pen: null, fetched_at: NOW },
        { home_score: 3, away_score: 0, home_score_pen: null, away_score_pen: null, fetched_at: new Date(NOW.getTime() - 10 * 60 * 1000) },
        { home_score: 2, away_score: 0, home_score_pen: null, away_score_pen: null, fetched_at: new Date(NOW.getTime() - 20 * 60 * 1000) },
        { home_score: 3, away_score: 0, home_score_pen: null, away_score_pen: null, fetched_at: new Date(NOW.getTime() - 35 * 60 * 1000) },
      ],
    })
    expect(result.shouldLock).toBe(false)
    if (!result.shouldLock) expect(result.reason).toBe('score_unstable')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 9. Regressão: computeLockDecision normal NÃO é afetado (testado indiretamente
//    verificando que computeTimeLockDecision é uma função separada que não altera
//    a lógica de status='finished')
// ─────────────────────────────────────────────────────────────────────────────
describe('computeTimeLockDecision — não interfere no caminho normal', () => {
  it('status=finished com score estável continua sendo tratado pelo computeLockDecision', () => {
    // computeTimeLockDecision nunca é chamado pelo caminho normal (status=finished);
    // verifica que computeLockDecision continua funcionando sem mudanças
    const normal = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'agreed',
      recentNonNullSnapshots: Array.from({ length: 3 }, () => ({ home_score: 1, away_score: 0, status: 'finished' })),
    })
    expect(normal.shouldLock).toBe(true)
    expect(normal.lockScore).toEqual({ home: 1, away: 0 })
  })
})
