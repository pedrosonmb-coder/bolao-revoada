import { db } from '@/lib/db'
import { matches } from '@/lib/db/schema'
import { isNotNull } from 'drizzle-orm'
import { recalculateMatchPredictions } from './recalculate-match-predictions'
import { recalculateTournamentPredictions } from './recalculate-tournament-predictions'

export async function recalculateAll(): Promise<{
  matches_processed: number
  predictions_updated: number
  tournament_updated: number
  duration_ms: number
}> {
  const start = Date.now()

  const lockedMatches = await db
    .select()
    .from(matches)
    .where(isNotNull(matches.result_locked_at))

  let predictions_updated = 0

  for (const match of lockedMatches) {
    const result = await recalculateMatchPredictions(match.id)
    predictions_updated += result.updated
  }

  const { updated: tournament_updated } = await recalculateTournamentPredictions()

  const duration_ms = Date.now() - start

  console.log(
    `[recalculate-all] matches_processed=${lockedMatches.length} predictions_updated=${predictions_updated} tournament_updated=${tournament_updated} duration_ms=${duration_ms}`
  )

  return {
    matches_processed: lockedMatches.length,
    predictions_updated,
    tournament_updated,
    duration_ms,
  }
}
