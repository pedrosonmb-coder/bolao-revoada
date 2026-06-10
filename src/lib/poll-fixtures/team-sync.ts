export type NewlyDefinedMatch = {
  id: number
  stage: string
  home_team_code: string
  home_team_name: string
  away_team_code: string
  away_team_name: string
}

type TeamInfo = { tla?: string | null; name?: string | null }

function shouldUpdate(current: string, apiVal: string | null | undefined): string | null {
  if (!apiVal || !apiVal.trim() || apiVal.trim().toUpperCase() === 'TBD') return null
  const trimmed = apiVal.trim()
  if (trimmed === current) return null
  return trimmed
}

export function computeTeamCodeChanges(
  match: {
    id: number
    stage: string
    home_team_code: string
    home_team_name: string
    away_team_code: string
    away_team_name: string
  },
  apiHomeTeam: TeamInfo,
  apiAwayTeam: TeamInfo,
): {
  changes: Record<string, string>
  newlyBothDefined: boolean
  effectiveHomeCode: string
  effectiveHomeName: string
  effectiveAwayCode: string
  effectiveAwayName: string
} {
  const wasEitherTbd = match.home_team_code === 'TBD' || match.away_team_code === 'TBD'

  const newHomeCode = shouldUpdate(match.home_team_code, apiHomeTeam.tla)
  const newHomeName = shouldUpdate(match.home_team_name, apiHomeTeam.name)
  const newAwayCode = shouldUpdate(match.away_team_code, apiAwayTeam.tla)
  const newAwayName = shouldUpdate(match.away_team_name, apiAwayTeam.name)

  const changes: Record<string, string> = {}
  if (newHomeCode) changes.home_team_code = newHomeCode
  if (newHomeName) changes.home_team_name = newHomeName
  if (newAwayCode) changes.away_team_code = newAwayCode
  if (newAwayName) changes.away_team_name = newAwayName

  const effectiveHomeCode = newHomeCode ?? match.home_team_code
  const effectiveHomeName = newHomeName ?? match.home_team_name
  const effectiveAwayCode = newAwayCode ?? match.away_team_code
  const effectiveAwayName = newAwayName ?? match.away_team_name

  const newlyBothDefined =
    wasEitherTbd && effectiveHomeCode !== 'TBD' && effectiveAwayCode !== 'TBD'

  return {
    changes,
    newlyBothDefined,
    effectiveHomeCode,
    effectiveHomeName,
    effectiveAwayCode,
    effectiveAwayName,
  }
}

export function isMatchTbd(match: { home_team_code: string; away_team_code: string }): boolean {
  return match.home_team_code === 'TBD' || match.away_team_code === 'TBD'
}
