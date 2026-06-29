import { describe, it, expect } from 'vitest'
import { buildRecapMessage } from '../build-recap-message'
import type { WeeklyRecapData } from '../collect-data'

// windowStart = 23/06 00:00 BRT (03:00 UTC), windowEnd = 29/06 22:00 BRT (30/06 01:00 UTC)
const WIN_START = new Date('2026-06-23T03:00:00Z')
const WIN_END   = new Date('2026-06-30T01:00:00Z')

// Kickoff: 25/06 14:00 BRT = 17:00 UTC
const KICKOFF_A = new Date('2026-06-25T17:00:00Z')
// Kickoff: 27/06 09:00 BRT = 12:00 UTC
const KICKOFF_B = new Date('2026-06-27T12:00:00Z')

const BASE: WeeklyRecapData = {
  isoYear: 2026,
  isoWeek: 26,
  windowStart: WIN_START,
  windowEnd:   WIN_END,
  allUsers: [
    { user_id: 1, name: 'Alice' },
    { user_id: 2, name: 'Bob' },
    { user_id: 3, name: 'Carol' },
  ],
  finishedMatches: [
    {
      id: 1,
      home_team_name: 'Brasil',
      away_team_name: 'Japão',
      home_score: 2,
      away_score: 1,
      kickoff_at: KICKOFF_A,
      stage: 'r32',
      venue: 'SoFi Stadium',
    },
    {
      id: 2,
      home_team_name: 'Argentina',
      away_team_name: 'Espanha',
      home_score: 1,
      away_score: 0,
      kickoff_at: KICKOFF_B,
      stage: 'r32',
      venue: 'MetLife Stadium',
    },
  ],
  rankingBefore: [
    { user_id: 2, name: 'Bob',   position: 1, total_points: 100 },
    { user_id: 1, name: 'Alice', position: 2, total_points:  90 },
    { user_id: 3, name: 'Carol', position: 3, total_points:  80 },
  ],
  rankingAfter: [
    { user_id: 1, name: 'Alice', position: 1, total_points: 165 },
    { user_id: 2, name: 'Bob',   position: 2, total_points: 155 },
    { user_id: 3, name: 'Carol', position: 3, total_points: 130 },
  ],
  biggestClimber: { user_id: 1, name: 'Alice', positionBefore: 2, positionAfter: 1, delta: 1 },
  biggestFaller:  { user_id: 2, name: 'Bob',   positionBefore: 1, positionAfter: 2, delta: -1 },
  bestGuess: {
    user_id: 1,
    name: 'Alice',
    match: { home_team_name: 'Brasil', away_team_name: 'Japão', home_score: 2, away_score: 1 },
    predicted: { home_score: 2, away_score: 1 },
    points: 25,
  },
  worstGuess: {
    user_id: 3,
    name: 'Carol',
    match: { home_team_name: 'Argentina', away_team_name: 'Espanha', home_score: 1, away_score: 0 },
    predicted: { home_score: 0, away_score: 3 },
    diff: 4,
  },
  upcomingMatches: [
    {
      home_team_name: 'França',
      away_team_name: 'Alemanha',
      kickoff_at: new Date('2026-07-01T21:00:00Z'),
      stage: 'qf',
      venue: 'AT&T Stadium',
      city: 'Dallas',
    },
  ],
  weeklyPoints: { 1: 75, 2: 55, 3: 50 },
}

// ---------------------------------------------------------------------------
// Estrutura geral
// ---------------------------------------------------------------------------

describe('buildRecapMessage — estrutura', () => {
  it('contém header com datas', () => {
    const msg = buildRecapMessage(BASE)
    expect(msg).toContain('BOLÃO DO REVOADA')
    expect(msg).toContain('23/06')
    expect(msg).toContain('29/06')
  })

  it('contém seção JOGOS DA SEMANA com contagem', () => {
    const msg = buildRecapMessage(BASE)
    expect(msg).toContain('JOGOS DA SEMANA (2)')
  })

  it('lista placares dos jogos', () => {
    const msg = buildRecapMessage(BASE)
    expect(msg).toContain('Brasil 2 x 1 Japão')
    expect(msg).toContain('Argentina 1 x 0 Espanha')
  })

  it('inclui fase e horário BRT nos jogos', () => {
    const msg = buildRecapMessage(BASE)
    // KICKOFF_A = 25/06 14h00 BRT
    expect(msg).toContain('R. de 32')
    expect(msg).toContain('25/06 14h00 BRT')
  })

  it('contém seção RANKING', () => {
    const msg = buildRecapMessage(BASE)
    expect(msg).toContain('RANKING')
    expect(msg).toContain('1. Alice')
    expect(msg).toContain('2. Bob')
    expect(msg).toContain('3. Carol')
  })

  it('contém seção DESTAQUES DA SEMANA', () => {
    const msg = buildRecapMessage(BASE)
    expect(msg).toContain('DESTAQUES DA SEMANA')
  })

  it('contém seção PRÓXIMOS JOGOS', () => {
    const msg = buildRecapMessage(BASE)
    expect(msg).toContain('PRÓXIMOS JOGOS (7 DIAS)')
    expect(msg).toContain('França x Alemanha')
    expect(msg).toContain('Dallas')
  })
})

// ---------------------------------------------------------------------------
// Pontos da semana
// ---------------------------------------------------------------------------

describe('buildRecapMessage — pontos da semana', () => {
  it('mostra pontos da semana para quem pontuou', () => {
    const msg = buildRecapMessage(BASE)
    expect(msg).toContain('+75 pts na semana')
    expect(msg).toContain('+55 pts na semana')
    expect(msg).toContain('+50 pts na semana')
  })

  it('não mostra pts na semana quando weeklyPoints é 0', () => {
    const data: WeeklyRecapData = { ...BASE, weeklyPoints: { 1: 0, 2: 0, 3: 0 } }
    const msg = buildRecapMessage(data)
    expect(msg).not.toContain('pts na semana')
  })

  it('não mostra pts na semana quando não há entrada para o usuário', () => {
    const data: WeeklyRecapData = { ...BASE, weeklyPoints: {} }
    const msg = buildRecapMessage(data)
    expect(msg).not.toContain('pts na semana')
  })
})

// ---------------------------------------------------------------------------
// Movimentos de posição
// ---------------------------------------------------------------------------

describe('buildRecapMessage — movimento de posição', () => {
  it('marca subida com ▲', () => {
    const msg = buildRecapMessage(BASE)
    // Alice subiu de 2º para 1º → ▲1
    expect(msg).toMatch(/Alice.*▲1/)
  })

  it('marca queda com ▼', () => {
    const msg = buildRecapMessage(BASE)
    // Bob caiu de 1º para 2º → ▼1
    expect(msg).toMatch(/Bob.*▼1/)
  })

  it('não marca quando posição é igual', () => {
    // Carol manteve 3º
    const msg = buildRecapMessage(BASE)
    expect(msg).not.toMatch(/Carol.*[▲▼]/)
  })

  it('sem rankingBefore, nenhum movimento é exibido', () => {
    const data: WeeklyRecapData = { ...BASE, rankingBefore: [] }
    const msg = buildRecapMessage(data)
    expect(msg).not.toContain('▲')
    expect(msg).not.toContain('▼')
  })
})

// ---------------------------------------------------------------------------
// Destaques
// ---------------------------------------------------------------------------

describe('buildRecapMessage — destaques', () => {
  it('exibe maior subida e maior queda', () => {
    const msg = buildRecapMessage(BASE)
    expect(msg).toContain('Maior subida: Alice (2º → 1º)')
    expect(msg).toContain('Maior queda: Bob (1º → 2º)')
  })

  it('exibe melhor palpite com placar e pontuação', () => {
    const msg = buildRecapMessage(BASE)
    expect(msg).toContain('Melhor palpite: Alice — 2x1 em Brasil x Japão (real: 2x1) — 25 pts')
  })

  it('exibe maior tropeço com diferença de gols', () => {
    const msg = buildRecapMessage(BASE)
    expect(msg).toContain('Maior tropeço: Carol — 0x3 em Argentina x Espanha (real: 1x0) — 4 gols de diferença')
  })

  it('omite seção DESTAQUES quando não há nenhum dado', () => {
    const data: WeeklyRecapData = {
      ...BASE,
      biggestClimber: null,
      biggestFaller: null,
      bestGuess: null,
      worstGuess: null,
    }
    const msg = buildRecapMessage(data)
    expect(msg).not.toContain('DESTAQUES')
  })

  it('exibe destaques parciais (apenas bestGuess)', () => {
    const data: WeeklyRecapData = {
      ...BASE,
      biggestClimber: null,
      biggestFaller: null,
      worstGuess: null,
    }
    const msg = buildRecapMessage(data)
    expect(msg).toContain('DESTAQUES')
    expect(msg).toContain('Melhor palpite')
    expect(msg).not.toContain('Maior subida')
    expect(msg).not.toContain('Maior tropeço')
  })
})

// ---------------------------------------------------------------------------
// Seções opcionais
// ---------------------------------------------------------------------------

describe('buildRecapMessage — seções opcionais', () => {
  it('omite PRÓXIMOS JOGOS quando lista vazia', () => {
    const data: WeeklyRecapData = { ...BASE, upcomingMatches: [] }
    const msg = buildRecapMessage(data)
    expect(msg).not.toContain('PRÓXIMOS JOGOS')
  })

  it('sem quebra de linha no final', () => {
    const msg = buildRecapMessage(BASE)
    expect(msg).not.toMatch(/\n$/)
  })
})

// ---------------------------------------------------------------------------
// Tom e formato
// ---------------------------------------------------------------------------

describe('buildRecapMessage — tom neutro', () => {
  it('não contém gírias ou linguagem coloquial', () => {
    const msg = buildRecapMessage(BASE)
    const gírias = ['mano', 'cara', 'né', 'pô', 'tá ', 'zoou', 'zoar', 'sarcas']
    for (const g of gírias) {
      expect(msg.toLowerCase()).not.toContain(g)
    }
  })

  it('não contém caracteres de markdown', () => {
    const msg = buildRecapMessage(BASE)
    expect(msg).not.toContain('**')
    expect(msg).not.toContain('__')
    expect(msg).not.toContain('##')
    expect(msg).not.toContain('*')
  })

  it('resultado é determinístico (chamadas múltiplas produzem o mesmo texto)', () => {
    expect(buildRecapMessage(BASE)).toBe(buildRecapMessage(BASE))
  })
})
