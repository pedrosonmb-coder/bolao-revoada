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

  it('contém os palpites no formato "Nome: h-a"', () => {
    const text = predictionsRevealedMessage(match, twoRows, [])
    expect(text).toContain('Ana: 2-1')
    expect(text).toContain('Pedro: 1-0')
  })

  it('cada palpite aparece em linha própria', () => {
    const rows = [
      { name: 'A', home: 1, away: 0 },
      { name: 'B', home: 2, away: 1 },
      { name: 'C', home: 0, away: 0 },
      { name: 'D', home: 3, away: 2 },
      { name: 'E', home: 1, away: 1 },
    ]
    const lines = predictionsRevealedMessage(match, rows, []).split('\n')
    // Cada nome deve aparecer em linha separada (não agrupados com ·)
    expect(lines.some((l) => l.startsWith('A: ') && !l.includes('B:'))).toBe(true)
    expect(lines.some((l) => l.startsWith('B: ') && !l.includes('A:'))).toBe(true)
    expect(lines.some((l) => l.startsWith('E: '))).toBe(true)
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


describe('predictionsRevealedMessage — quem passa (mata-mata)', () => {
  it('empate com qualified=home → mostra nome pt-BR do time da casa', () => {
    const rows = [{ name: 'João', home: 1, away: 1, qualified: 'home' }]
    const text = predictionsRevealedMessage(match, rows, [])
    expect(text).toContain('João: 1-1 (passa: Brasil)')
  })

  it('empate com qualified=away → mostra nome pt-BR do time visitante', () => {
    const rows = [{ name: 'João', home: 1, away: 1, qualified: 'away' }]
    const text = predictionsRevealedMessage(match, rows, [])
    expect(text).toContain('João: 1-1 (passa: Argentina)')
  })

  it('empate SEM qualified → formato simples, sem "(passa:)"', () => {
    const rows = [{ name: 'João', home: 1, away: 1 }]
    const text = predictionsRevealedMessage(match, rows, [])
    expect(text).toContain('João: 1-1')
    expect(text).not.toContain('passa:')
  })

  it('não-empate com qualified → NÃO mostra "(passa:)"', () => {
    const rows = [{ name: 'João', home: 2, away: 1, qualified: 'home' }]
    const text = predictionsRevealedMessage(match, rows, [])
    expect(text).toContain('João: 2-1')
    expect(text).not.toContain('passa:')
  })

  it('mistura empate+qualified e vitória no mesmo reveal', () => {
    const rows = [
      { name: 'Ana', home: 2, away: 1 },
      { name: 'João', home: 1, away: 1, qualified: 'away' },
    ]
    const text = predictionsRevealedMessage(match, rows, [])
    expect(text).toContain('Ana: 2-1')
    expect(text).not.toContain('Ana: 2-1 (passa:)')
    expect(text).toContain('João: 1-1 (passa: Argentina)')
  })

})

describe('predictionsRevealedMessage — formato colável (texto puro)', () => {
  it('não contém tags HTML no corpo da mensagem', () => {
    const rows = [
      { name: 'Ana', home: 2, away: 1 },
      { name: 'Bruno', home: 1, away: 1, qualified: 'away' },
    ]
    const text = predictionsRevealedMessage(match, rows, ['Igor'])
    expect(text).not.toMatch(/<[^>]+>/)
  })

  it('linha completa: Nome: h-a (passa: Time)', () => {
    const rows = [{ name: 'Carlos', home: 0, away: 0, qualified: 'home' }]
    const text = predictionsRevealedMessage(match, rows, [])
    expect(text).toContain('Carlos: 0-0 (passa: Brasil)')
  })
})
