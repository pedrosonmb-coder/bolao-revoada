export type PositionPoint = { date: string; position: number; points: number }
export type ChartPoint = PositionPoint & { x: number; y: number }

export const CHART_W = 300
export const CHART_H = 120
export const PAD = { top: 14, right: 36, bottom: 24, left: 28 } as const

export function toChartPoints(
  history: PositionPoint[],
  width = CHART_W,
  height = CHART_H,
  pad = PAD,
): ChartPoint[] {
  if (history.length === 0) return []

  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  const positions = history.map((p) => p.position)
  const minPos = Math.min(...positions)
  const maxPos = Math.max(...positions)
  const posRange = maxPos - minPos

  return history.map((p, i) => {
    const xFrac = history.length === 1 ? 0.5 : i / (history.length - 1)
    const yFrac = posRange === 0 ? 0.5 : (p.position - minPos) / posRange
    return {
      ...p,
      x: pad.left + xFrac * innerW,
      y: pad.top + yFrac * innerH,
    }
  })
}

export function xLabelStep(n: number): number {
  if (n <= 10) return 1
  if (n <= 20) return 3
  return 5
}
