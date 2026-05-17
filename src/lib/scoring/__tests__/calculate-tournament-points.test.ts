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

describe('calculateTournamentPoints', () => {
  it('tudo errado → 0 pts', () => {
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

  it('só campeão correto → 100', () => {
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

  it('campeão + vice corretos → 150', () => {
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

  it('campeão + vice + 1 semifinalista → 175', () => {
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

  it('campeão + vice + 2 semifinalistas (ordem invertida no palpite) → 200', () => {
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

  it('semifinalista_1 é o mesmo que campeão real → não conta como "outro semi"', () => {
    // BRA é campeão; palpitar BRA como semi_1 não deve ganhar 25 pts
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
    ).toBe(25) // só FRA conta
  })
})
