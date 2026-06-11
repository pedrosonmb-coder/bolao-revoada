import { describe, it, expect } from 'vitest'
import { predictionsRevealedMessage } from '../messages'

const match = { home_team_code: 'BRA', away_team_code: 'ARG' }

const twoRows = [
  { name: 'Ana', home: 2, away: 1 },
  { name: 'Pedro', home: 1, away: 0 },
]

describe('predictionsRevealedMessage', () => {
  it('retorna string vazia quando rows está vazio (sem faltantes)', () => {
    expect(predictionsRevealedMessage(match, [], [])).toBe('')
  })

  it('retorna string vazia quando rows vazio mesmo com faltantes', () => {
    expect(predictionsRevealedMessage(match, [], ['Lima', 'Ruben'])).toBe('')
  })

  it('cabeçalho contém bandeiras e nomes dos times', () => {
    const text = predictionsRevealedMessage(match, twoRows, [])
    expect(text).toContain('🔓 Palpites revelados')
    expect(text).toContain('🇧🇷')
    expect(text).toContain('🇦🇷')
    expect(text).toContain('Brasil')
    expect(text).toContain('Argentina')
  })

  it('contém os palpites no formato Nome h-a', () => {
    const text = predictionsRevealedMessage(match, twoRows, [])
    expect(text).toContain('Ana 2-1')
    expect(text).toContain('Pedro 1-0')
  })

  it('1 faltante → "Sem palpite: Lima"', () => {
    const text = predictionsRevealedMessage(match, twoRows, ['Lima'])
    expect(text).toContain('Sem palpite: Lima')
  })

  it('2 faltantes → "Sem palpite: Lima, Ruben"', () => {
    const text = predictionsRevealedMessage(match, twoRows, ['Lima', 'Ruben'])
    expect(text).toContain('Sem palpite: Lima, Ruben')
  })

  it('sem faltantes → sem rodapé "Sem palpite"', () => {
    const text = predictionsRevealedMessage(match, twoRows, [])
    expect(text).not.toContain('Sem palpite')
  })

  it('quebra a cada 4 itens em linhas separadas', () => {
    const rows = [
      { name: 'A', home: 1, away: 0 },
      { name: 'B', home: 2, away: 1 },
      { name: 'C', home: 0, away: 0 },
      { name: 'D', home: 3, away: 2 },
      { name: 'E', home: 1, away: 1 },
    ]
    const text = predictionsRevealedMessage(match, rows, [])
    const lines = text.split('\n')
    const bodyLine1 = lines.find((l) => l.includes('A 1-0') && l.includes('D 3-2'))
    expect(bodyLine1).toBeDefined()
    const bodyLine2 = lines.find((l) => l.includes('E 1-1') && !l.includes('A 1-0'))
    expect(bodyLine2).toBeDefined()
  })

  it('escapa HTML nos nomes dos palpitantes (<, >, &)', () => {
    const rows = [{ name: 'Jo<ão & Maria>', home: 1, away: 0 }]
    const text = predictionsRevealedMessage(match, rows, [])
    expect(text).toContain('Jo&lt;ão &amp; Maria&gt;')
    expect(text).not.toContain('<ão')
  })

  it('escapa HTML nos nomes dos faltantes', () => {
    const text = predictionsRevealedMessage(match, twoRows, ['Lima & <Co>'])
    expect(text).toContain('Lima &amp; &lt;Co&gt;')
    expect(text).not.toContain('& <Co>')
  })
})
