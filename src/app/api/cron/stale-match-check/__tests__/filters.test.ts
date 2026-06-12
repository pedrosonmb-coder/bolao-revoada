import { describe, it, expect } from 'vitest'
import { filterUnscoredLockedMatches, isStaleUnlocked } from '../filters'

describe('filterUnscoredLockedMatches', () => {
  it('jogo travado com palpites sem computed_at → incluído no alerta unscored', () => {
    const match = { id: 3 }
    const result = filterUnscoredLockedMatches([match], new Set([3]))
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(3)
  })

  it('jogo travado onde todos os palpites têm computed_at → NÃO incluído', () => {
    const match = { id: 3 }
    // ID 3 não está no set de unscored → já foi pontuado
    const result = filterUnscoredLockedMatches([match], new Set([99]))
    expect(result).toHaveLength(0)
  })
})

describe('isStaleUnlocked (regressão caso antigo)', () => {
  it('jogo não travado com kickoff > 3h atrás → é stale', () => {
    const threshold = new Date('2026-06-12T16:00:00Z')
    const kickoff = new Date('2026-06-12T15:00:00Z')
    expect(isStaleUnlocked(kickoff, null, threshold)).toBe(true)
  })

  it('jogo JÁ travado com kickoff > 3h atrás → não é stale (lock resolveu)', () => {
    const threshold = new Date('2026-06-12T16:00:00Z')
    const kickoff = new Date('2026-06-12T15:00:00Z')
    const lockedAt = new Date('2026-06-12T15:30:00Z')
    expect(isStaleUnlocked(kickoff, lockedAt, threshold)).toBe(false)
  })
})
