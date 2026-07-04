import { db } from '@/lib/db'
import { matches, predictions } from '@/lib/db/schema'
import { eq, isNotNull } from 'drizzle-orm'
import { calculateMatchPoints } from './calculate-match-points'
import type { Stage } from './multipliers'

export async function recalculateMatchPredictions(
  matchId: number
): Promise<{ updated: number }> {
  const match = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .get()

  if (!match || !match.result_locked_at) {
    return { updated: 0 }
  }

  if (match.home_score === null || match.away_score === null) {
    return { updated: 0 }
  }

  const allPredictions = await db
    .select()
    .from(predictions)
    .where(eq(predictions.match_id, matchId))

  await Promise.all(
    allPredictions.map((prediction) => {
      const breakdown = calculateMatchPoints(
        {
          home_score: prediction.home_score,
          away_score: prediction.away_score,
          qualified_team_code: prediction.qualified_team_code as 'home' | 'away' | null,
        },
        {
          stage: match.stage as Stage,
          home_score: match.home_score!,
          away_score: match.away_score!,
          qualified_team_code: match.qualified_team_code as 'home' | 'away' | null,
        }
      )

      return db
        .update(predictions)
        .set({
          base_points: breakdown.base_points,
          classification_bonus: breakdown.classification_bonus,
          multiplier: breakdown.multiplier,
          points_awarded: breakdown.points_awarded,
          computed_at: new Date(),
        })
        .where(eq(predictions.id, prediction.id))
    })
  )

  return { updated: allPredictions.length }
}
