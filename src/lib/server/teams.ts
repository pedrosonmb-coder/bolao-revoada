import { db } from '@/lib/db'
import { matches } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export type Team = {
  code: string
  name: string
}

export async function getGroupStageTeams(): Promise<Team[]> {
  // Pega times únicos da fase de grupos (home + away)
  const rows = await db
    .selectDistinct({ code: matches.home_team_code, name: matches.home_team_name })
    .from(matches)
    .where(eq(matches.stage, 'group'))

  const awayRows = await db
    .selectDistinct({ code: matches.away_team_code, name: matches.away_team_name })
    .from(matches)
    .where(eq(matches.stage, 'group'))

  const combined = new Map<string, string>()
  for (const r of rows) combined.set(r.code, r.name)
  for (const r of awayRows) combined.set(r.code, r.name)

  return Array.from(combined.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}
