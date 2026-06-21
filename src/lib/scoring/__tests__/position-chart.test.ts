import { describe, it, expect } from 'vitest'
import { toChartPoints, xLabelStep, PAD, CHART_W, CHART_H } from '../position-chart'

const innerW = CHART_W - PAD.left - PAD.right
const innerH = CHART_H - PAD.top - PAD.bottom

const pt = (date: string, position: number) => ({ date, position, points: 0 })

describe('toChartPoints', () => {
  it('array vazio → []', () => {
    expect(toChartPoints([])).toEqual([])
  })

  it('1 ponto → centralizado em X e Y', () => {
    const [p] = toChartPoints([pt('2026-06-14', 3)])
    expect(p.x).toBeCloseTo(PAD.left + innerW * 0.5)
    expect(p.y).toBeCloseTo(PAD.top + innerH * 0.5)
  })

  it('2 pontos, mesmo position → linha horizontal no centro', () => {
    const pts = toChartPoints([pt('2026-06-14', 2), pt('2026-06-15', 2)])
    expect(pts[0].y).toBeCloseTo(PAD.top + innerH * 0.5)
    expect(pts[1].y).toBeCloseTo(PAD.top + innerH * 0.5)
    expect(pts[0].x).toBeCloseTo(PAD.left)
    expect(pts[1].x).toBeCloseTo(PAD.left + innerW)
  })

  it('melhor posição (menor número) → y mais próximo do topo', () => {
    const pts = toChartPoints([pt('2026-06-14', 5), pt('2026-06-15', 1)])
    expect(pts[1].y).toBeLessThan(pts[0].y)
  })

  it('posição pior (maior número) → y mais próximo do fundo', () => {
    const pts = toChartPoints([pt('2026-06-14', 1), pt('2026-06-15', 5)])
    expect(pts[1].y).toBeGreaterThan(pts[0].y)
  })

  it('primeiro ponto → x = PAD.left', () => {
    const pts = toChartPoints([pt('a', 1), pt('b', 2), pt('c', 3)])
    expect(pts[0].x).toBeCloseTo(PAD.left)
  })

  it('último ponto → x = PAD.left + innerW', () => {
    const pts = toChartPoints([pt('a', 1), pt('b', 2), pt('c', 3)])
    expect(pts[pts.length - 1].x).toBeCloseTo(PAD.left + innerW)
  })

  it('posição mais alta (1º) → y = PAD.top', () => {
    const pts = toChartPoints([pt('a', 3), pt('b', 1)])
    expect(pts[1].y).toBeCloseTo(PAD.top)
  })

  it('posição mais baixa → y = PAD.top + innerH', () => {
    const pts = toChartPoints([pt('a', 1), pt('b', 4)])
    expect(pts[1].y).toBeCloseTo(PAD.top + innerH)
  })

  it('dados originais preservados nas props', () => {
    const pts = toChartPoints([{ date: '2026-06-14', position: 2, points: 42 }])
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
