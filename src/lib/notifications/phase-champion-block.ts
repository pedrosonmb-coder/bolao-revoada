export const KNOCKOUT_STAGES = ['r32', 'r16', 'qf', 'sf', '3rd', 'final'] as const

export function resolveChampionBlock(stage: string): 'group' | 'knockout' | null {
  if (stage === 'group') return 'group'
  if ((KNOCKOUT_STAGES as readonly string[]).includes(stage)) return 'knockout'
  return null
}
