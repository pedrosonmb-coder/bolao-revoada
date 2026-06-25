import { describe, it, expect } from 'vitest'
import { groupPlayerPredictions } from '../group-player-predictions'

describe('groupPlayerPredictions', () => {
  it('agrupa grafias idênticas em uma entrada', () => {
    const result = groupPlayerPredictions(['mbappe', 'mbappe', 'mbappe'])
    expect(result).toHaveLength(1)
    expect(result[0].normalized).toBe('mbappe')
    expect(result[0].count).toBe(3)
  })

  it('colapsa variantes com case diferente na mesma entrada', () => {
    const result = groupPlayerPredictions(['Mbappe', 'MBAPPE', 'mbappe'])
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(3)
  })

  it('colapsa variantes com acento diferente na mesma entrada', () => {
    const result = groupPlayerPredictions(['Mbappé', 'mbappe', 'Mbappe'])
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(3)
  })

  it('grafias genuinamente diferentes ficam em entradas separadas', () => {
    const result = groupPlayerPredictions(['mbappe', 'kylian', 'mbappe'])
    expect(result).toHaveLength(2)
    const mbappe = result.find((r) => r.normalized === 'mbappe')
    const kylian = result.find((r) => r.normalized === 'kylian')
    expect(mbappe?.count).toBe(2)
    expect(kylian?.count).toBe(1)
  })

  it('ordena por count DESC', () => {
    const result = groupPlayerPredictions(['kylian', 'mbappe', 'mbappe', 'mbappe'])
    expect(result[0].normalized).toBe('mbappe')
    expect(result[1].normalized).toBe('kylian')
  })

  it('sample preserva a grafia original do primeiro palpite visto', () => {
    const result = groupPlayerPredictions(['Mbappé', 'mbappe'])
    expect(result[0].sample).toBe('Mbappé')
  })

  it('null e undefined são ignorados', () => {
    const result = groupPlayerPredictions([null, undefined, 'mbappe', null])
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(1)
  })

  it('array vazio → retorna vazio', () => {
    expect(groupPlayerPredictions([])).toHaveLength(0)
  })

  it('array só com nulls → retorna vazio', () => {
    expect(groupPlayerPredictions([null, null])).toHaveLength(0)
  })
})
