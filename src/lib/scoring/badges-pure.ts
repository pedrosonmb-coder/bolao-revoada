// Pure badge logic — no DB imports, fully testable.

export type BadgeId =
  | 'champion_group'
  | 'champion_knockout'
  | 'champion_overall'
  | 'champion_brazil'

export type BadgeEntry = {
  id: BadgeId
  label: string
}

type PhaseStatus = 'not_started' | 'in_progress' | 'closed'

type PartialEntry = { user_id: number; position: number }

export type BadgeCriteria = {
  userId: number
  groupStatus: PhaseStatus
  knockoutStatus: PhaseStatus
  finalLocked: boolean
  brazilEliminated: boolean
  groupRanking: PartialEntry[]
  knockoutRanking: PartialEntry[]
  overallRanking: PartialEntry[]
  brazilRanking: PartialEntry[]
}

const BADGE_LABELS: Record<BadgeId, string> = {
  champion_group:    'Campeão dos Grupos',
  champion_knockout: 'Campeão do Mata-mata',
  champion_overall:  'Campeão Geral',
  champion_brazil:   'Campeão do Brasil',
}

function isChampion(userId: number, ranking: PartialEntry[]): boolean {
  return ranking.some((e) => e.user_id === userId && e.position === 1)
}

export function computeBadgesFromData(c: BadgeCriteria): BadgeEntry[] {
  const badges: BadgeEntry[] = []

  if (c.groupStatus === 'closed' && isChampion(c.userId, c.groupRanking)) {
    badges.push({ id: 'champion_group', label: BADGE_LABELS.champion_group })
  }
  if (c.knockoutStatus === 'closed' && isChampion(c.userId, c.knockoutRanking)) {
    badges.push({ id: 'champion_knockout', label: BADGE_LABELS.champion_knockout })
  }
  if (c.finalLocked && isChampion(c.userId, c.overallRanking)) {
    badges.push({ id: 'champion_overall', label: BADGE_LABELS.champion_overall })
  }
  if (c.brazilEliminated && isChampion(c.userId, c.brazilRanking)) {
    badges.push({ id: 'champion_brazil', label: BADGE_LABELS.champion_brazil })
  }

  return badges
}
