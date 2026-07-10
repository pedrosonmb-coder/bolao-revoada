import { describe, it, expect } from 'vitest'
import { calculateTournamentPoints } from '../calculate-tournament-points'

const result = {
  champion_code: 'BRA',
  runner_up_code: 'ARG',
  semifinalists: ['BRA', 'ARG', 'FRA', 'ESP'],
  top_scorer_name: 'Vinicius Jr',
  best_player_name: 'Messi',
  best_young_player_name: 'Endrick',
}

describe('calculateTournamentPoints — top-4 com consolação (times)', () => {
  // result: campeão BRA, vice ARG, top-4 = {BRA, ARG, FRA, ESP}

  it('todos os 4 papéis exatos → 200 (100+50+25+25)', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: 'BRA',
          runner_up_code: 'ARG',
          semifinalist_1_code: 'FRA',
          semifinalist_2_code: 'ESP',
          top_scorer_name: null,
          best_player_name: null,
          best_young_player_name: null,
        },
        result
      )
    ).toBe(200)
  })

  it('acertou os 4 times do top-4 mas TODOS os papéis errados → 100 (25×4)', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: 'ARG', // real vice, não campeão
          runner_up_code: 'BRA', // real campeão, não vice
          semifinalist_1_code: 'FRA',
          semifinalist_2_code: 'ESP',
          top_scorer_name: null,
          best_player_name: null,
          best_young_player_name: null,
        },
        result
      )
    ).toBe(100)
  })

  it('marcou como campeão um time que foi vice → 25 (não 50, não 100)', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: 'ARG', // real vice
          runner_up_code: null,
          semifinalist_1_code: null,
          semifinalist_2_code: null,
          top_scorer_name: null,
          best_player_name: null,
          best_young_player_name: null,
        },
        result
      )
    ).toBe(25)
  })

  it('marcou como vice um time que foi campeão → 25', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: null,
          runner_up_code: 'BRA', // real campeão
          semifinalist_1_code: null,
          semifinalist_2_code: null,
          top_scorer_name: null,
          best_player_name: null,
          best_young_player_name: null,
        },
        result
      )
    ).toBe(25)
  })

  it('marcou como semifinalista um time que foi campeão → 25', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: null,
          runner_up_code: null,
          semifinalist_1_code: 'BRA', // real campeão
          semifinalist_2_code: null,
          top_scorer_name: null,
          best_player_name: null,
          best_young_player_name: null,
        },
        result
      )
    ).toBe(25)
  })

  it('acertou campeão exato + 3 times fora do top-4 → 100', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: 'BRA',
          runner_up_code: 'GER',
          semifinalist_1_code: 'ENG',
          semifinalist_2_code: 'ITA',
          top_scorer_name: null,
          best_player_name: null,
          best_young_player_name: null,
        },
        result
      )
    ).toBe(100)
  })

  it('nenhum time no top-4 → 0', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: 'GER',
          runner_up_code: 'ENG',
          semifinalist_1_code: 'POR',
          semifinalist_2_code: 'ITA',
          top_scorer_name: 'Kane',
          best_player_name: 'Ronaldo',
          best_young_player_name: 'Yamal',
        },
        result
      )
    ).toBe(0)
  })

  it('combinação parcial: 1 papel certo (vice) + 1 top-4 em papel errado + 2 fora → 75', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: 'GER', // fora do top-4 → 0
          runner_up_code: 'ARG', // real vice, papel certo → 50
          semifinalist_1_code: 'FRA', // real semi, top-4 → 25
          semifinalist_2_code: 'ITA', // fora do top-4 → 0
          top_scorer_name: null,
          best_player_name: null,
          best_young_player_name: null,
        },
        result
      )
    ).toBe(75)
  })

  it('só campeão correto (demais fora do top-4) → 100', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: 'BRA',
          runner_up_code: 'ENG',
          semifinalist_1_code: 'POR',
          semifinalist_2_code: 'ITA',
          top_scorer_name: null,
          best_player_name: null,
          best_young_player_name: null,
        },
        result
      )
    ).toBe(100)
  })

  it('campeão + vice corretos (demais fora do top-4) → 150', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: 'BRA',
          runner_up_code: 'ARG',
          semifinalist_1_code: 'POR',
          semifinalist_2_code: 'ITA',
          top_scorer_name: null,
          best_player_name: null,
          best_young_player_name: null,
        },
        result
      )
    ).toBe(150)
  })

  it('campeão + vice + 1 semifinalista no top-4 → 175', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: 'BRA',
          runner_up_code: 'ARG',
          semifinalist_1_code: 'FRA',
          semifinalist_2_code: 'ITA',
          top_scorer_name: null,
          best_player_name: null,
          best_young_player_name: null,
        },
        result
      )
    ).toBe(175)
  })

  it('campeão + vice + 2 outros semifinalistas (ordem invertida no palpite) → 200 (teto do bloco de times)', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: 'BRA',
          runner_up_code: 'ARG',
          semifinalist_1_code: 'ESP',
          semifinalist_2_code: 'FRA',
          top_scorer_name: null,
          best_player_name: null,
          best_young_player_name: null,
        },
        result
      )
    ).toBe(200)
  })

  it('semifinalista_1 marcado é o campeão real → conta 25 de consolação (regra nova: papel errado ainda pontua por estar no top-4)', () => {
    // BRA é campeão real; palpitar BRA como semi_1 agora ganha 25 (consolação),
    // diferente da regra antiga (posicional), que dava 0 pro BRA nesse slot.
    expect(
      calculateTournamentPoints(
        {
          champion_code: null,
          runner_up_code: null,
          semifinalist_1_code: 'BRA',
          semifinalist_2_code: 'FRA',
          top_scorer_name: null,
          best_player_name: null,
          best_young_player_name: null,
        },
        result
      )
    ).toBe(50) // 25 (BRA consolação) + 25 (FRA consolação)
  })

  it('tudo correto → 325 (máximo)', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: 'BRA',
          runner_up_code: 'ARG',
          semifinalist_1_code: 'FRA',
          semifinalist_2_code: 'ESP',
          top_scorer_name: 'Vinicius Jr',
          best_player_name: 'Messi',
          best_young_player_name: 'Endrick',
        },
        result
      )
    ).toBe(325)
  })

  it('top scorer case diferente → acerta', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: null,
          runner_up_code: null,
          semifinalist_1_code: null,
          semifinalist_2_code: null,
          top_scorer_name: 'vinicius jr',
          best_player_name: null,
          best_young_player_name: null,
        },
        result
      )
    ).toBe(50)
  })

  it('top scorer com acento diferente → acerta após normalização', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: null,
          runner_up_code: null,
          semifinalist_1_code: null,
          semifinalist_2_code: null,
          top_scorer_name: null,
          best_player_name: null,
          best_young_player_name: 'Endrick',
        },
        { ...result, best_young_player_name: 'Éndrick' }
      )
    ).toBe(25)
  })

  it('top scorer com alias (|): palpite casa com 2ª grafia → acerta', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: null,
          runner_up_code: null,
          semifinalist_1_code: null,
          semifinalist_2_code: null,
          top_scorer_name: 'kylian',
          best_player_name: null,
          best_young_player_name: null,
        },
        { ...result, top_scorer_name: 'Mbappé|kylian|k mbappe' }
      )
    ).toBe(50)
  })

  it('top scorer com alias (|): palpite casa com 1ª grafia (retrocompat com campo simples)', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: null,
          runner_up_code: null,
          semifinalist_1_code: null,
          semifinalist_2_code: null,
          top_scorer_name: 'Vinicius Jr',
          best_player_name: null,
          best_young_player_name: null,
        },
        result // result.top_scorer_name = 'Vinicius Jr' (sem '|')
      )
    ).toBe(50)
  })

  it('top scorer com alias (|): nenhuma grafia casa → 0 pts', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: null,
          runner_up_code: null,
          semifinalist_1_code: null,
          semifinalist_2_code: null,
          top_scorer_name: 'neymar',
          best_player_name: null,
          best_young_player_name: null,
        },
        { ...result, top_scorer_name: 'Mbappé|kylian|k mbappe' }
      )
    ).toBe(0)
  })

  it('alias com normalização: acento diferente na alias → acerta', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: null,
          runner_up_code: null,
          semifinalist_1_code: null,
          semifinalist_2_code: null,
          top_scorer_name: 'mbappe',
          best_player_name: null,
          best_young_player_name: null,
        },
        { ...result, top_scorer_name: 'Mbappé|kylian' }
      )
    ).toBe(50)
  })

  it('best_player e best_young_player também aceitam alias', () => {
    expect(
      calculateTournamentPoints(
        {
          champion_code: null,
          runner_up_code: null,
          semifinalist_1_code: null,
          semifinalist_2_code: null,
          top_scorer_name: null,
          best_player_name: 'leo messi',
          best_young_player_name: 'endrick',
        },
        {
          ...result,
          best_player_name: 'Messi|Leo Messi',
          best_young_player_name: 'Endrick|Éndrick',
        }
      )
    ).toBe(75) // 50 best_player + 25 best_young
  })
})
