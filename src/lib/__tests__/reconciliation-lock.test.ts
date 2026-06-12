import { describe, it, expect } from 'vitest'
import { computeLockDecision } from '../reconciliation-lock'

// Helpers
const snaps = (count: number, home: number, away: number, status: string | null = 'finished') =>
  Array.from({ length: count }, () => ({ home_score: home, away_score: away, status }))

describe('computeLockDecision', () => {
  // T1 — fonte única (partial): só football-data responde, FIFA null → deve travar
  it('T1: fonte única partial, 3 snapshots finished 2-0 → trava 2-0', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 2, 0, 'finished'),
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 2, away: 0 })
  })

  // T2 — finished com null/null: live estáveis em 2-0, depois finished com null → trava 2-0
  // Os live 2-0 chegam via recentNonNullSnapshots (status=live); nenhum snapshot
  // finished+não-nulo ainda — lógica usa todos os não-nulos (live 2-0 estáveis).
  it('T2: snapshotStatus=finished, 5 snapshots live 2-0 → trava 2-0 (nunca null)', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(5, 2, 0, 'live'),
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 2, away: 0 })
    expect(result.lockScore!.home).not.toBeNull()
    expect(result.lockScore!.away).not.toBeNull()
  })

  // T3 — oscilação live→scheduled→live→finished: não-nulos finished consistentes → trava
  it('T3: oscilação de status, 3 snapshots finished 2-0 → trava 2-0', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'agreed',
      recentNonNullSnapshots: snaps(3, 2, 0, 'finished'),
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 2, away: 0 })
  })

  // T4 — regressão: 2 fontes agreed, 10 snapshots concordando → continua travando
  it('T4: regressão — agreed + 10 snapshots finished concordando → trava', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'agreed',
      recentNonNullSnapshots: snaps(10, 1, 0, 'finished'),
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 1, away: 0 })
  })

  // T5 — negativo: placares divergentes nos snapshots finished → não trava
  it('T5: placares divergentes nos finished → não trava', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: [
        { home_score: 2, away_score: 0, status: 'finished' },
        { home_score: 1, away_score: 0, status: 'finished' },
        { home_score: 2, away_score: 0, status: 'finished' },
      ],
    })
    expect(result.shouldLock).toBe(false)
    expect(result.lockScore).toBeNull()
  })

  // T6 — caso MEX x RSA corrigido: live[1-0,2-0] + finished[2-0,2-0,2-0]
  // Com snapshots finished presentes, ignora os live (incluso o 1-0 do intervalo)
  // e trava com os 3 finished concordando em 2-0.
  it('T6: live[1-0,2-0] + finished[2-0,2-0,2-0] → trava 2-0 no 3º finished', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: [
        // mais recentes primeiro
        { home_score: 2, away_score: 0, status: 'finished' },
        { home_score: 2, away_score: 0, status: 'finished' },
        { home_score: 2, away_score: 0, status: 'finished' },
        { home_score: 2, away_score: 0, status: 'live' },
        { home_score: 1, away_score: 0, status: 'live' }, // placar do intervalo — ignorado
      ],
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 2, away: 0 })
  })

  // T7 — negativo: só live com placar divergente (halftime), sem finished → não trava
  it('T7: live[2-0, 2-0, 1-0] sem finished → não trava (placar diverge)', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: [
        { home_score: 2, away_score: 0, status: 'live' },
        { home_score: 2, away_score: 0, status: 'live' },
        { home_score: 1, away_score: 0, status: 'live' },
      ],
    })
    expect(result.shouldLock).toBe(false)
  })

  // Negativos adicionais
  it('status live → não trava (nunca travar antes de finished)', () => {
    const result = computeLockDecision({
      snapshotStatus: 'live',
      resultKind: 'agreed',
      recentNonNullSnapshots: snaps(10, 2, 0),
    })
    expect(result.shouldLock).toBe(false)
  })

  it('status null → não trava', () => {
    const result = computeLockDecision({
      snapshotStatus: null,
      resultKind: 'agreed',
      recentNonNullSnapshots: snaps(10, 2, 0),
    })
    expect(result.shouldLock).toBe(false)
  })

  it('resultKind conflict → não trava', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'conflict',
      recentNonNullSnapshots: snaps(10, 2, 0),
    })
    expect(result.shouldLock).toBe(false)
  })

  it('resultKind all_failed → não trava', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'all_failed',
      recentNonNullSnapshots: snaps(10, 2, 0),
    })
    expect(result.shouldLock).toBe(false)
  })

  it('menos de 3 snapshots finished → não trava (abaixo do floor)', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(2, 2, 0, 'finished'),
    })
    expect(result.shouldLock).toBe(false)
  })

  it('exatamente 3 finished concordando → trava (no floor)', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 3, 1, 'finished'),
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 3, away: 1 })
  })
})
