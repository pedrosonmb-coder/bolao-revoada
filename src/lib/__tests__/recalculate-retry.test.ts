import { describe, it, expect, vi } from 'vitest'
import { retryRecalculate } from '../recalculate-retry'

describe('retryRecalculate', () => {
  it('falha na 1ª tentativa, sucede na 2ª → retorna resultado do retry', async () => {
    let calls = 0
    const fn = vi.fn().mockImplementation(async () => {
      calls++
      if (calls === 1) throw new Error('transient DB error')
      return { updated: 5 }
    })

    const result = await retryRecalculate(42, fn, 0)

    expect(result).toEqual({ updated: 5 })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('falha nas 2 tentativas → retorna null, não relança', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent error'))

    const result = await retryRecalculate(42, fn, 0)

    expect(result).toBeNull()
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
