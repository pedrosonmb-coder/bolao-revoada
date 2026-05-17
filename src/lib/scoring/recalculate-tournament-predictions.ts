import { db } from '@/lib/db'
import { tournamentResults, tournamentPredictions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { calculateTournamentPoints } from './calculate-tournament-points'

export async function recalculateTournamentPredictions(): Promise<{ updated: number }> {
  const result = await db
    .select()
    .from(tournamentResults)
    .where(eq(tournamentResults.id, 1))
    .get()

  if (
    !result ||
    !result.champion_code ||
    !result.runner_up_code ||
    !result.semifinalists ||
    !result.top_scorer_name ||
    !result.best_player_name ||
    !result.best_young_player_name
  ) {
    return { updated: 0 }
  }

  let semifinalists: string[]
  try {
    semifinalists = JSON.parse(result.semifinalists) as string[]
  } catch {
    return { updated: 0 }
  }

  const tournamentResult = {
    champion_code: result.champion_code,
    runner_up_code: result.runner_up_code,
    semifinalists,
    top_scorer_name: result.top_scorer_name,
    best_player_name: result.best_player_name,
    best_young_player_name: result.best_young_player_name,
  }

  const allPredictions = await db.select().from(tournamentPredictions)

  for (const prediction of allPredictions) {
    const pts = calculateTournamentPoints(
      {
        champion_code: prediction.champion_code,
        runner_up_code: prediction.runner_up_code,
        semifinalist_1_code: prediction.semifinalist_1_code,
        semifinalist_2_code: prediction.semifinalist_2_code,
        top_scorer_name: prediction.top_scorer_name,
        best_player_name: prediction.best_player_name,
        best_young_player_name: prediction.best_young_player_name,
      },
      tournamentResult
    )

    await db
      .update(tournamentPredictions)
      .set({ points_awarded: pts, computed_at: new Date() })
      .where(eq(tournamentPredictions.id, prediction.id))
  }

  return { updated: allPredictions.length }
}
