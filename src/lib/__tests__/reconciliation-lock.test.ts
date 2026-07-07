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

  // Testes Opção A: prova que a query de lock não precisa de filtro próprio de plausibilidade,
  // porque snapshots implausíveis são rejeitados no saveSnapshot (reconciliation.ts fase 2).

  // Sem Opção A: mostra o que aconteceria se 2025-8 chegasse ao banco (lock bloqueado)
  it('banco contaminado (cenário pré-fix): 2025-8 entre finished → não trava (allAgree falha)', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: [
        { home_score: 2025, away_score: 8, status: 'finished' }, // Wikipedia antes da Opção A
        { home_score: 4, away_score: 1, status: 'finished' },
        { home_score: 4, away_score: 1, status: 'finished' },
        { home_score: 4, away_score: 1, status: 'finished' },
      ],
    })
    expect(result.shouldLock).toBe(false) // 2025-8 ≠ 4-1 → allAgree=false → 7h de conflict
  })

  // Com Opção A: 2025-8 nunca chega ao banco → série limpa → trava corretamente
  it('banco limpo (Opção A aplicada): 3 snapshots finished 4-1 → trava 4-1', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: [
        { home_score: 4, away_score: 1, status: 'finished' },
        { home_score: 4, away_score: 1, status: 'finished' },
        { home_score: 4, away_score: 1, status: 'finished' },
      ],
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 4, away: 1 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Regressão de placar — proteção contra fonte que reverte gol erroneamente
// ─────────────────────────────────────────────────────────────────────────────
describe('computeLockDecision — regression_detected', () => {
  // Caso AUS×EGY: pico 1-1 durante live, fonte reverteu para 0-0 e reportou finished
  it('AUS×EGY pattern: peak 1-1, lock candidates 0-0 → regression_detected', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 0, 0, 'finished'),
      peakScore: { home: 1, away: 1 },
    })
    expect(result.shouldLock).toBe(false)
    if (!result.shouldLock) expect(result.reason).toBe('regression_detected')
  })

  // Caso ARG×CPV: pico 3-2 por 1 poll, fonte caiu para 2-1 e estabilizou
  it('ARG×CPV pattern: peak 3-2, lock candidates 2-1 → regression_detected', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 2, 1, 'finished'),
      peakScore: { home: 3, away: 2 },
    })
    expect(result.shouldLock).toBe(false)
    if (!result.shouldLock) expect(result.reason).toBe('regression_detected')
  })

  // Caso COL×GHA: gol fantasma (+1), placar SÓ SUBIU — NÃO é regressão, trava normal
  it('COL×GHA pattern: peak 1-0, lock candidates 2-0 (aumento) → trava normalmente', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 2, 0, 'finished'),
      peakScore: { home: 1, away: 0 },
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 2, away: 0 })
  })

  it('regressão só no away: peak 1-2, lock 1-1 → regression_detected', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 1, 1, 'finished'),
      peakScore: { home: 1, away: 2 },
    })
    expect(result.shouldLock).toBe(false)
    if (!result.shouldLock) expect(result.reason).toBe('regression_detected')
  })

  it('regressão só no home: peak 2-0, lock 1-0 → regression_detected', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 1, 0, 'finished'),
      peakScore: { home: 2, away: 0 },
    })
    expect(result.shouldLock).toBe(false)
    if (!result.shouldLock) expect(result.reason).toBe('regression_detected')
  })

  // Peak igual ao lock → empate exato, sem regressão → trava normal
  it('peak igual ao lock score (1-0 = 1-0) → trava normalmente', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 1, 0, 'finished'),
      peakScore: { home: 1, away: 0 },
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 1, away: 0 })
  })

  // Sem peakScore (null): jogo sem histórico ou primeira poll → sem proteção, trava normal
  it('peakScore null → sem proteção de regressão, trava normalmente', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 0, 0, 'finished'),
      peakScore: null,
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 0, away: 0 })
  })

  // Sem peakScore (undefined = não passado): backward-compat — comportamento atual preservado
  it('peakScore não passado (undefined) → trava normalmente (backward-compat)', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'agreed',
      recentNonNullSnapshots: snaps(3, 2, 1, 'finished'),
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 2, away: 1 })
  })

  // Jogo normal (placar só sobe): 0-0 → 1-0 → 1-1 → trava 1-1
  it('caminho feliz: peak 1-1, lock 1-1 → sem regressão → trava 1-1', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 1, 1, 'finished'),
      peakScore: { home: 1, away: 1 },
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 1, away: 1 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Mata-mata empatado sem pênaltis — bug do match 96 (SUI x COL): a fonte marca
// 'finished' aos 90min de um jogo de mata-mata empatado, antes da prorrogação/
// pênaltis. NUNCA travar automaticamente nesse estado — falta o classificado real.
// ─────────────────────────────────────────────────────────────────────────────
describe('computeLockDecision — mata-mata empatado sem pênaltis (knockout_draw_pending)', () => {
  // Caso SUI x COL: r16, 0-0, finished, sem pen scores → NÃO trava
  it('r16 0-0 sem pens → não trava (knockout_draw_pending) [caso SUI x COL]', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 0, 0, 'finished'),
      stage: 'r16',
      homeScorePen: null,
      awayScorePen: null,
    })
    expect(result.shouldLock).toBe(false)
    if (!result.shouldLock) expect(result.reason).toBe('knockout_draw_pending')
  })

  it('r16 1-1 COM pens (4-3) → trava normalmente (classificado é derivável)', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 1, 1, 'finished'),
      stage: 'r16',
      homeScorePen: 4,
      awayScorePen: 3,
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 1, away: 1 })
  })

  it('mata-mata com vencedor no tempo normal (2-1) → trava normalmente (não é empate)', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 2, 1, 'finished'),
      stage: 'r16',
      homeScorePen: null,
      awayScorePen: null,
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 2, away: 1 })
  })

  it('fase de grupos empatada (0-0) sem pens → trava normalmente (empate é resultado válido)', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 0, 0, 'finished'),
      stage: 'group',
      homeScorePen: null,
      awayScorePen: null,
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 0, away: 0 })
  })

  it('stage não informado (chamada legada) → guarda ignorada, trava normalmente', () => {
    const result = computeLockDecision({
      snapshotStatus: 'finished',
      resultKind: 'partial',
      recentNonNullSnapshots: snaps(3, 0, 0, 'finished'),
    })
    expect(result.shouldLock).toBe(true)
    expect(result.lockScore).toEqual({ home: 0, away: 0 })
  })
})
