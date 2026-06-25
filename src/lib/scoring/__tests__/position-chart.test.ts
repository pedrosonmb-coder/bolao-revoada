import { describe, it, expect } from 'vitest'
import { toChartPoints, computeYRange, xLabelStep, PAD, CHART_W, CHART_H } from '../position-chart'

const innerW = CHART_W - PAD.left - PAD.right
const innerH = CHART_H - PAD.top - PAD.bottom

const pt = (date: string, position: number) => ({ date, position, points: 0 })

// With 13 participants: minRange = ceil(13 * 0.4) = 6
const TOTAL = 13

describe('computeYRange', () => {
  it('array vazio → effectiveMin = effectiveMax = 1', () => {
    expect(computeYRange([], TOTAL)).toEqual({ effectiveMin: 1, effectiveMax: 1 })
  })

  it('realRange < minRange → usa minRange e centraliza', () => {
    // positions [1,2]: realRange=1, minRange=6, effectiveRange=6
    // halfPad=floor((6-1)/2)=2, effectiveMin=max(1,1-2)=1, effectiveMax=7
    const r = computeYRange([1, 2], TOTAL)
    expect(r.effectiveMin).toBe(1)
    expect(r.effectiveMax).toBe(7)
  })

  it('realRange ≥ minRange → usa realRange (sem padding)', () => {
    // positions [1,8]: realRange=7 ≥ 6, effectiveRange=7
    // halfPad=0, effectiveMin=1, effectiveMax=8
    const r = computeYRange([1, 8], TOTAL)
    expect(r.effectiveMin).toBe(1)
    expect(r.effectiveMax).toBe(8)
  })

  it('effectiveMin nunca fica abaixo de 1', () => {
    // positions [3,4]: realRange=1, halfPad=2, 3-2=1 → max(1,1)=1
    const r = computeYRange([3, 4], TOTAL)
    expect(r.effectiveMin).toBeGreaterThanOrEqual(1)
  })

  it('totalParticipants=5 → minRange=2', () => {
    const r = computeYRange([1, 1], 5)
    expect(r.effectiveMax - r.effectiveMin).toBe(2)
  })
})

describe('toChartPoints', () => {
  it('array vazio → []', () => {
    expect(toChartPoints([], TOTAL)).toEqual([])
  })

  it('1 ponto → centralizado em X e Y', () => {
    const [p] = toChartPoints([pt('2026-06-14', 3)], TOTAL)
    expect(p.x).toBeCloseTo(PAD.left + innerW * 0.5)
    expect(p.y).toBeCloseTo(PAD.top + innerH * 0.5)
  })

  it('2 pontos, mesmo position → linha horizontal (y iguais)', () => {
    const pts = toChartPoints([pt('2026-06-14', 2), pt('2026-06-15', 2)], TOTAL)
    expect(pts[0].y).toBeCloseTo(pts[1].y)
    expect(pts[0].x).toBeCloseTo(PAD.left)
    expect(pts[1].x).toBeCloseTo(PAD.left + innerW)
  })

  it('melhor posição (menor número) → y mais próximo do topo', () => {
    const pts = toChartPoints([pt('2026-06-14', 5), pt('2026-06-15', 1)], TOTAL)
    expect(pts[1].y).toBeLessThan(pts[0].y)
  })

  it('posição pior (maior número) → y mais próximo do fundo', () => {
    const pts = toChartPoints([pt('2026-06-14', 1), pt('2026-06-15', 5)], TOTAL)
    expect(pts[1].y).toBeGreaterThan(pts[0].y)
  })

  it('primeiro ponto → x = PAD.left', () => {
    const pts = toChartPoints([pt('a', 1), pt('b', 2), pt('c', 3)], TOTAL)
    expect(pts[0].x).toBeCloseTo(PAD.left)
  })

  it('último ponto → x = PAD.left + innerW', () => {
    const pts = toChartPoints([pt('a', 1), pt('b', 2), pt('c', 3)], TOTAL)
    expect(pts[pts.length - 1].x).toBeCloseTo(PAD.left + innerW)
  })

  it('posição mais alta (1º) com effectiveMin=1 → y = PAD.top', () => {
    // positions [5,1]: minPos=1 → effectiveMin clamped at 1 → position 1 maps to top
    const pts = toChartPoints([pt('a', 5), pt('b', 1)], TOTAL)
    expect(pts[1].y).toBeCloseTo(PAD.top)
  })

  it('posição mais baixa → y = PAD.top + innerH quando realRange ≥ minRange', () => {
    // positions [1,8]: realRange=7 ≥ minRange=6 → effectiveMin=1, effectiveMax=8
    // position 8 → yFrac = (8-1)/7 = 1.0 → y = PAD.top + innerH
    const pts = toChartPoints([pt('a', 1), pt('b', 8)], TOTAL)
    expect(pts[1].y).toBeCloseTo(PAD.top + innerH)
  })

  it('range pequeno (1→2, 13 participantes) → ponto inferior NÃO ocupa o fundo', () => {
    // effectiveRange=6, yFrac para pos 2 = (2-1)/6 ≈ 0.17 → bem acima do fundo
    const pts = toChartPoints([pt('a', 1), pt('b', 2)], TOTAL)
    expect(pts[1].y).toBeLessThan(PAD.top + innerH)
  })

  it('range pequeno (1→2): variação ocupa menos de 25% da altura', () => {
    const pts = toChartPoints([pt('a', 1), pt('b', 2)], TOTAL)
    const chartHeight = PAD.top + innerH - PAD.top
    const variationFraction = (pts[1].y - pts[0].y) / chartHeight
    expect(variationFraction).toBeLessThan(0.25)
  })

  it('totalParticipants menor → minRange menor', () => {
    // 5 participantes, minRange=2. positions [1,2]: realRange=1 < 2
    // effectiveRange=2, effectiveMin=1, effectiveMax=3
    // yFrac para pos 2 = (2-1)/2 = 0.5 → ocupa 50% (menos que 100%)
    const pts = toChartPoints([pt('a', 1), pt('b', 2)], 5)
    expect(pts[1].y).toBeLessThan(PAD.top + innerH)
  })

  it('dados originais preservados nas props', () => {
    const pts = toChartPoints([{ date: '2026-06-14', position: 2, points: 42 }], TOTAL)
    expect(pts[0].date).toBe('2026-06-14')
    expect(pts[0].position).toBe(2)
    expect(pts[0].points).toBe(42)
  })
})

describe('xLabelStep', () => {
  it('≤ 10 pontos → step 1 (todos os labels)', () => {
    expect(xLabelStep(1)).toBe(1)
    expect(xLabelStep(10)).toBe(1)
  })
  it('11-20 pontos → step 3', () => {
    expect(xLabelStep(11)).toBe(3)
    expect(xLabelStep(20)).toBe(3)
  })
  it('> 20 pontos → step 5', () => {
    expect(xLabelStep(21)).toBe(5)
    expect(xLabelStep(30)).toBe(5)
  })
})
