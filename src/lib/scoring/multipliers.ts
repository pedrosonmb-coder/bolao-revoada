export const STAGE_MULTIPLIERS = {
  group: 1.0,
  r32: 1.5,
  r16: 2.0,
  qf: 2.0,
  sf: 2.0,
  '3rd': 2.0,
  final: 2.5,
} as const

export type Stage = keyof typeof STAGE_MULTIPLIERS

export function deriveBreakdown(
  base_points: number,
  stage: string,
  points_awarded: number
): { multiplier: number; bonus: number } {
  const multiplier = STAGE_MULTIPLIERS[stage as Stage] ?? 1.0
  const bonus = points_awarded - Math.round(base_points * multiplier)
  return { multiplier, bonus }
}
