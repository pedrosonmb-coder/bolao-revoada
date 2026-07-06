import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPhaseOpen = vi.fn().mockResolvedValue(undefined)
const mockPhaseChampion = vi.fn().mockResolvedValue(undefined)
const mockPenaltyCheck = vi.fn().mockResolvedValue(undefined)
const mockMissingQualifier = vi.fn().mockResolvedValue(undefined)
const mockLockReview = vi.fn().mockResolvedValue(undefined)

vi.mock('../phase-open', () => ({ checkAndNotifyPhaseOpen: mockPhaseOpen }))
vi.mock('../phase-champion', () => ({ checkAndNotifyPhaseChampion: mockPhaseChampion }))
vi.mock('../admin-alert', () => ({
  alertAdminPenaltyCheck: mockPenaltyCheck,
  alertAdminMissingQualifier: mockMissingQualifier,
  alertAdminLockReview: mockLockReview,
}))

// Import after mocks are registered
const { notifyAfterLock } = await import('../notify-after-lock')

const baseMatch = {
  id: 84,
  stage: 'r32',
  home_score: 2,
  away_score: 1,
  home_score_pen: null,
  away_score_pen: null,
  qualified_team_code: 'home',
  status: 'finished',
  result_locked_at: new Date(),
} as Parameters<typeof notifyAfterLock>[0]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('notifyAfterLock — penalty-check', () => {
  it('jogo sem pênaltis: dispara phase-open e phase-champion, NÃO penalty-check', async () => {
    await notifyAfterLock(baseMatch)
    await Promise.resolve()
    expect(mockPhaseOpen).toHaveBeenCalledWith(baseMatch)
    expect(mockPhaseChampion).toHaveBeenCalledWith(baseMatch)
    expect(mockPenaltyCheck).not.toHaveBeenCalled()
  })

  it('jogo com pênaltis: dispara penalty-check', async () => {
    const matchWithPens = { ...baseMatch, home_score: 1, away_score: 1, home_score_pen: 5, away_score_pen: 3, qualified_team_code: 'home' }
    await notifyAfterLock(matchWithPens)
    await Promise.resolve()
    expect(mockPenaltyCheck).toHaveBeenCalledWith(matchWithPens)
  })

  it('jogo cancelado (home_score_pen null): NÃO dispara penalty-check', async () => {
    const cancelledMatch = { ...baseMatch, status: 'cancelled', home_score: null, away_score: null }
    await notifyAfterLock(cancelledMatch)
    await Promise.resolve()
    expect(mockPenaltyCheck).not.toHaveBeenCalled()
  })

  it('falha em phase-open não derruba: phase-champion ainda é chamado', async () => {
    mockPhaseOpen.mockRejectedValueOnce(new Error('network error'))
    await notifyAfterLock(baseMatch)
    await Promise.resolve()
    expect(mockPhaseChampion).toHaveBeenCalled()
  })
})

describe('notifyAfterLock — missing-qualifier', () => {
  it('knockout + empate + qtc null + finished → dispara missing-qualifier', async () => {
    const m = { ...baseMatch, home_score: 1, away_score: 1, qualified_team_code: null, status: 'finished' }
    await notifyAfterLock(m)
    await Promise.resolve()
    expect(mockMissingQualifier).toHaveBeenCalledWith(m)
  })

  it('knockout + empate + qtc null + status cancelled → NÃO dispara', async () => {
    const m = { ...baseMatch, home_score: 1, away_score: 1, qualified_team_code: null, status: 'cancelled' }
    await notifyAfterLock(m)
    await Promise.resolve()
    expect(mockMissingQualifier).not.toHaveBeenCalled()
  })

  it('knockout + empate + qtc definido → NÃO dispara', async () => {
    const m = { ...baseMatch, home_score: 1, away_score: 1, qualified_team_code: 'home', status: 'finished' }
    await notifyAfterLock(m)
    await Promise.resolve()
    expect(mockMissingQualifier).not.toHaveBeenCalled()
  })

  it('grupo + empate → NÃO dispara (stage=group)', async () => {
    const m = { ...baseMatch, stage: 'group', home_score: 1, away_score: 1, qualified_team_code: null, status: 'finished' }
    await notifyAfterLock(m)
    await Promise.resolve()
    expect(mockMissingQualifier).not.toHaveBeenCalled()
  })

  it('knockout + não-empate → NÃO dispara', async () => {
    const m = { ...baseMatch, home_score: 2, away_score: 1, qualified_team_code: 'home', status: 'finished' }
    await notifyAfterLock(m)
    await Promise.resolve()
    expect(mockMissingQualifier).not.toHaveBeenCalled()
  })

  it('penalty-check e missing-qualifier são mutuamente exclusivos', async () => {
    // Com pen scores → penalty-check, mas qtc não é null (derive funciona) → missing não dispara
    const withPens = { ...baseMatch, home_score: 1, away_score: 1, home_score_pen: 5, away_score_pen: 3, qualified_team_code: 'home' }
    await notifyAfterLock(withPens)
    await Promise.resolve()
    expect(mockPenaltyCheck).toHaveBeenCalled()
    expect(mockMissingQualifier).not.toHaveBeenCalled()

    vi.clearAllMocks()

    // Sem pen scores, empate, sem qtc → missing dispara, penalty-check não
    const missingQtc = { ...baseMatch, home_score: 1, away_score: 1, home_score_pen: null, qualified_team_code: null }
    await notifyAfterLock(missingQtc)
    await Promise.resolve()
    expect(mockPenaltyCheck).not.toHaveBeenCalled()
    expect(mockMissingQualifier).toHaveBeenCalled()
  })
})

describe('notifyAfterLock — lock_review', () => {
  // Mata-mata sem pênaltis → sempre alerta (rotina de conferência)
  it('mata-mata sem pênaltis: dispara lock_review (regressionSuspected=false)', async () => {
    await notifyAfterLock(baseMatch) // r32, sem pens
    await Promise.resolve()
    expect(mockLockReview).toHaveBeenCalledWith(baseMatch, { regressionSuspected: false, peakScore: undefined })
  })

  // Mata-mata com pênaltis → penalty_check já cobre, lock_review NÃO dispara
  it('mata-mata com pênaltis: NÃO dispara lock_review (penalty_check cobre)', async () => {
    const withPens = { ...baseMatch, home_score: 1, away_score: 1, home_score_pen: 5, away_score_pen: 3, qualified_team_code: 'home' }
    await notifyAfterLock(withPens)
    await Promise.resolve()
    expect(mockPenaltyCheck).toHaveBeenCalled()
    expect(mockLockReview).not.toHaveBeenCalled()
  })

  // Grupo normal (sem regressão) → NÃO alerta (seria spam — 72 jogos)
  it('grupo sem regressão: NÃO dispara lock_review', async () => {
    const groupMatch = { ...baseMatch, stage: 'group' }
    await notifyAfterLock(groupMatch)
    await Promise.resolve()
    expect(mockLockReview).not.toHaveBeenCalled()
  })

  // Grupo com regressão suspeita → alerta (placar suspeito)
  it('grupo com regressão (peak > lock): dispara lock_review (regressionSuspected=true)', async () => {
    const groupMatch = { ...baseMatch, stage: 'group', home_score: 0, away_score: 0 }
    const peakScore = { home: 1, away: 1 }
    await notifyAfterLock(groupMatch, { peakScore })
    await Promise.resolve()
    expect(mockLockReview).toHaveBeenCalledWith(groupMatch, { regressionSuspected: true, peakScore })
  })

  // Mata-mata com regressão → alerta com tom forte
  it('mata-mata com regressão: dispara lock_review (regressionSuspected=true)', async () => {
    const m = { ...baseMatch, home_score: 1, away_score: 0 }
    const peakScore = { home: 2, away: 0 }
    await notifyAfterLock(m, { peakScore })
    await Promise.resolve()
    expect(mockLockReview).toHaveBeenCalledWith(m, { regressionSuspected: true, peakScore })
  })

  // Peak igual ao lock score → não é regressão, mata-mata ainda alerta (mas sem suspeita)
  it('mata-mata, peak = lock score: dispara lock_review (regressionSuspected=false)', async () => {
    const m = { ...baseMatch, home_score: 2, away_score: 1 }
    const peakScore = { home: 2, away: 1 }
    await notifyAfterLock(m, { peakScore })
    await Promise.resolve()
    expect(mockLockReview).toHaveBeenCalledWith(m, { regressionSuspected: false, peakScore })
  })

  // Grupo com peakScore null → não há histórico suficiente → sem regressão suspeita → NÃO alerta
  it('grupo com peakScore null: NÃO dispara lock_review', async () => {
    const groupMatch = { ...baseMatch, stage: 'group' }
    await notifyAfterLock(groupMatch, { peakScore: null })
    await Promise.resolve()
    expect(mockLockReview).not.toHaveBeenCalled()
  })

  // Sem options (backward compat): mata-mata alerta, grupo não
  it('sem options (undefined): mata-mata dispara, grupo não', async () => {
    await notifyAfterLock(baseMatch) // r32
    await Promise.resolve()
    expect(mockLockReview).toHaveBeenCalled()

    vi.clearAllMocks()

    const groupMatch = { ...baseMatch, stage: 'group' }
    await notifyAfterLock(groupMatch)
    await Promise.resolve()
    expect(mockLockReview).not.toHaveBeenCalled()
  })

  // Idempotência: lock_review deve usar chave única por match (garantido pelo tipo+key no sendNotification)
  // Aqui apenas verificamos que a função é chamada 1× por notifyAfterLock (não duplica internamente)
  it('lock_review é chamado exatamente 1× por notifyAfterLock', async () => {
    await notifyAfterLock(baseMatch)
    await Promise.resolve()
    expect(mockLockReview).toHaveBeenCalledTimes(1)
  })
})
