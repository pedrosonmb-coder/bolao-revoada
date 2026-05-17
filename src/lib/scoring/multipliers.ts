export const STAGE_MULTIPLIERS = {
  group: 1.0,
  r32: 1.5,
  r16: 2.0,
  qf: 2.5,
  sf: 3.0,
  '3rd': 2.0,
  final: 4.0,
} as const

export type Stage = keyof typeof STAGE_MULTIPLIERS
