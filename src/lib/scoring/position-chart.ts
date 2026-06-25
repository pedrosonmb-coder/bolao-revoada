export type PositionPoint = { date: string; position: number; points: number }
export type ChartPoint = PositionPoint & { x: number; y: number }

export const CHART_W = 300
export const CHART_H = 120
export const PAD = { top: 14, right: 36, bottom: 24, left: 28 } as const

// Returns the effective Y-axis range after applying a minimum span proportional to
// totalParticipants (40 % of total), centred over the actual min/max.
// This prevents a 1-position swing from filling 100 % of chart height.
export function computeYRange(
  positions: number[],
  totalParticipants: number,
): { effectiveMin: number; effectiveMax: number } {
  if (positions.length === 0) return { effectiveMin: 1, effectiveMax: 1 }
  const minPos = Math.min(...positions)
  const maxPos = Math.max(...positions)
  const realRange = maxPos - minPos
  const minRange = Math.ceil(totalParticipants * 0.4)
  const effectiveRange = Math.max(realRange, minRange, 1)
  const halfPad = Math.floor((effectiveRange - realRange) / 2)
  const effectiveMin = Math.max(1, minPos - halfPad)
  const effectiveMax = effectiveMin + effectiveRange
  return { effectiveMin, effectiveMax }
}

export function toChartPoints(
  history: PositionPoint[],
  totalParticipants: number,
  width = CHART_W,
  height = CHART_H,
  pad = PAD,
): ChartPoint[] {
  if (history.length === 0) return []

  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  const positions = history.map((p) => p.position)
  const { effectiveMin, effectiveMax } = computeYRange(positions, totalParticipants)
  const effectiveRange = effectiveMax - effectiveMin

  return history.map((p, i) => {
    const xFrac = history.length === 1 ? 0.5 : i / (history.length - 1)
    // Single-point series: centre vertically (no movement to represent)
    const yFrac = history.length === 1 ? 0.5 : (p.position - effectiveMin) / effectiveRange
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
