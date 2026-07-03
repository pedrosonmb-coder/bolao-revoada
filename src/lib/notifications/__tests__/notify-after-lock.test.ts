import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPhaseOpen = vi.fn().mockResolvedValue(undefined)
const mockPhaseChampion = vi.fn().mockResolvedValue(undefined)
const mockPenaltyCheck = vi.fn().mockResolvedValue(undefined)

vi.mock('../phase-open', () => ({ checkAndNotifyPhaseOpen: mockPhaseOpen }))
vi.mock('../phase-champion', () => ({ checkAndNotifyPhaseChampion: mockPhaseChampion }))
vi.mock('../admin-alert', () => ({ alertAdminPenaltyCheck: mockPenaltyCheck }))

// Import after mocks are registered
const { notifyAfterLock } = await import('../notify-after-lock')

const baseMatch = {
  id: 84,
  stage: 'r32',
  home_score: 2,
  away_score: 2,
  home_score_pen: null,
  away_score_pen: null,
  qualified_team_code: 'home',
  status: 'finished',
  result_locked_at: new Date(),
} as Parameters<typeof notifyAfterLock>[0]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('notifyAfterLock', () => {
  it('jogo sem pênaltis: dispara phase-open e phase-champion, NÃO penalty-check', async () => {
    await notifyAfterLock(baseMatch)
    // funções async best-effort — aguarda microtask queue
    await Promise.resolve()
    expect(mockPhaseOpen).toHaveBeenCalledWith(baseMatch)
    expect(mockPhaseChampion).toHaveBeenCalledWith(baseMatch)
    expect(mockPenaltyCheck).not.toHaveBeenCalled()
  })

  it('jogo com pênaltis: dispara as 3', async () => {
    const matchWithPens = { ...baseMatch, home_score_pen: 5, away_score_pen: 3 }
    await notifyAfterLock(matchWithPens)
    await Promise.resolve()
    expect(mockPhaseOpen).toHaveBeenCalledWith(matchWithPens)
    expect(mockPhaseChampion).toHaveBeenCalledWith(matchWithPens)
    expect(mockPenaltyCheck).toHaveBeenCalledWith(matchWithPens)
  })

  it('jogo cancelado (home_score_pen null): NÃO dispara penalty-check', async () => {
    const cancelledMatch = { ...baseMatch, status: 'cancelled', home_score: null, away_score: null }
    await notifyAfterLock(cancelledMatch)
    await Promise.resolve()
    expect(mockPhaseOpen).toHaveBeenCalled()
    expect(mockPhaseChampion).toHaveBeenCalled()
    expect(mockPenaltyCheck).not.toHaveBeenCalled()
  })

  it('falha em phase-open não derruba: phase-champion ainda é chamado', async () => {
    mockPhaseOpen.mockRejectedValueOnce(new Error('network error'))
    await notifyAfterLock(baseMatch)
    await Promise.resolve()
    // phase-champion é chamado independentemente (ambas são fire-and-forget)
    expect(mockPhaseChampion).toHaveBeenCalled()
  })
})
