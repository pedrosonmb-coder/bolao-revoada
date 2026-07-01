import { describe, it, expect } from 'vitest'
import { deriveBreakdown } from '../multipliers'

describe('deriveBreakdown', () => {
  it('Grupos — sem bônus: 25 × 1.0 = 25', () => {
    const { multiplier, bonus } = deriveBreakdown(25, 'group', 25)
    expect(multiplier).toBe(1.0)
    expect(bonus).toBe(0)
  })

  it('Grupos — 10 base sem bônus = 10', () => {
    const { multiplier, bonus } = deriveBreakdown(10, 'group', 10)
    expect(multiplier).toBe(1.0)
    expect(bonus).toBe(0)
  })

  it('Oitavas r32 — 18 base × 1.5 = 27, sem bônus', () => {
    const { multiplier, bonus } = deriveBreakdown(18, 'r32', 27)
    expect(multiplier).toBe(1.5)
    expect(bonus).toBe(0)
  })

  it('Oitavas r32 — 25 base × 1.5 = 38 (arredondado), sem bônus', () => {
    // Math.round(25 * 1.5) = Math.round(37.5) = 38
    const { multiplier, bonus } = deriveBreakdown(25, 'r32', 38)
    expect(multiplier).toBe(1.5)
    expect(bonus).toBe(0)
  })

  it('Oitavas r32 — 18 base × 1.5 + 8 (classificado) = 35', () => {
    const { multiplier, bonus } = deriveBreakdown(18, 'r32', 35)
    expect(multiplier).toBe(1.5)
    expect(bonus).toBe(8)
  })

  it('Quartas qf — 25 base × 2.0 + 8 = 58', () => {
    const { multiplier, bonus } = deriveBreakdown(25, 'qf', 58)
    expect(multiplier).toBe(2.0)
    expect(bonus).toBe(8)
  })

  it('Final — 25 base × 2.5 = 63 (Math.round(62.5)), sem bônus', () => {
    const { multiplier, bonus } = deriveBreakdown(25, 'final', 63)
    expect(multiplier).toBe(2.5)
    expect(bonus).toBe(0)
  })

  it('Final — 0 base × 2.5 = 0, sem bônus', () => {
    const { multiplier, bonus } = deriveBreakdown(0, 'final', 0)
    expect(multiplier).toBe(2.5)
    expect(bonus).toBe(0)
  })

  it('stage desconhecido cai no multiplier 1.0', () => {
    const { multiplier, bonus } = deriveBreakdown(10, 'unknown_stage', 10)
    expect(multiplier).toBe(1.0)
    expect(bonus).toBe(0)
  })

  it('bonus derivado bate com points_awarded em todos os casos de base_points', () => {
    const stages = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']
    const baseCases = [0, 10, 12, 15, 18, 25]
    for (const stage of stages) {
      for (const base of baseCases) {
        for (const bonusInput of [0, 8]) {
          const { multiplier } = deriveBreakdown(base, stage, 0)
          const expected_points = Math.round(base * multiplier) + bonusInput
          const { bonus } = deriveBreakdown(base, stage, expected_points)
          expect(bonus).toBe(bonusInput)
        }
      }
    }
  })
})
