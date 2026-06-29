// Pure badge logic — no DB imports, fully testable.

export type BadgeId =
  | 'champion_group'
  | 'champion_knockout'
  | 'champion_overall'
  | 'champion_brazil'

type PhaseStatus = 'not_started' | 'in_progress' | 'closed'

type PartialEntry = { user_id: number; position: number }

// ---------------------------------------------------------------------------
// Ranking-level badge map (central, one pass for all users)
// ---------------------------------------------------------------------------

export function computeBadgeMap(
  groupRanking: PartialEntry[],
  knockoutRanking: PartialEntry[],
  overallRanking: PartialEntry[],
  brazilRanking: PartialEntry[],
): Map<number, BadgeId[]> {
  const map = new Map<number, BadgeId[]>()
  const award = (ranking: PartialEntry[], badge: BadgeId) => {
    for (const e of ranking) {
      if (e.position === 1) {
        const list = map.get(e.user_id) ?? []
        list.push(badge)
        map.set(e.user_id, list)
      }
    }
  }
  award(groupRanking, 'champion_group')
  award(knockoutRanking, 'champion_knockout')
  award(overallRanking, 'champion_overall')
  award(brazilRanking, 'champion_brazil')
  return map
}

// ---------------------------------------------------------------------------
// Champions map (mural)
// ---------------------------------------------------------------------------

export type ChampionEntry = { name: string; total_points: number }

export type ChampionsMap = {
  overall: ChampionEntry[] | null    // null = fase ainda não fechou
  group: ChampionEntry[] | null
  knockout: ChampionEntry[] | null
  brazil: ChampionEntry[] | null
  tournament: ChampionEntry[] | null
}

type NamedEntry = { position: number; name: string; total_points: number }

function championsFrom(ranking: NamedEntry[]): ChampionEntry[] {
  return ranking
    .filter((e) => e.position === 1)
    .map((e) => ({ name: e.name, total_points: e.total_points }))
}

export function computeChampionsMap(
  groupStatus: PhaseStatus,
  knockoutStatus: PhaseStatus,
  finalLocked: boolean,
  brazilEliminated: boolean,
  tournamentStatus: 'not_started' | 'closed',
  groupRanking: NamedEntry[],
  knockoutRanking: NamedEntry[],
  overallRanking: NamedEntry[],
  brazilRanking: NamedEntry[],
  tournamentRanking: NamedEntry[],
): ChampionsMap {
  return {
    group:      groupStatus === 'closed'    ? championsFrom(groupRanking)    : null,
    knockout:   knockoutStatus === 'closed' ? championsFrom(knockoutRanking) : null,
    overall:    finalLocked                 ? championsFrom(overallRanking)  : null,
    brazil:     brazilEliminated            ? championsFrom(brazilRanking)   : null,
    tournament: tournamentStatus === 'closed' ? championsFrom(tournamentRanking) : null,
  }
}

export type BadgeEntry = {
  id: BadgeId
  label: string
}

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
