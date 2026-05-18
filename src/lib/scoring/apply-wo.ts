import { db } from '@/lib/db'
import { matches, predictions } from '@/lib/db/schema'
import { eq, and, ne, isNotNull } from 'drizzle-orm'

export async function applyWO(matchId: number): Promise<{ predictions_updated: number }> {
  const match = await db.select().from(matches).where(eq(matches.id, matchId)).get()
  if (!match || match.status !== 'cancelled') return { predictions_updated: 0 }

  const matchPredictions = await db
    .select()
    .from(predictions)
    .where(eq(predictions.match_id, matchId))

  if (matchPredictions.length === 0) return { predictions_updated: 0 }

  // Busca todos os match_ids do mesmo stage para filtrar palpites relevantes
  const stageMatchIds = new Set(
    (await db
      .select({ id: matches.id })
      .from(matches)
      .where(and(eq(matches.stage, match.stage), ne(matches.id, matchId)))
    ).map((m) => m.id)
  )

  let updated = 0

  for (const pred of matchPredictions) {
    let avgPoints = 0

    if (stageMatchIds.size > 0) {
      // Palpites computados do user no mesmo stage, excluindo o match cancelado
      const stagePreds = await db
        .select({ points_awarded: predictions.points_awarded, match_id: predictions.match_id })
        .from(predictions)
        .where(
          and(
            eq(predictions.user_id, pred.user_id),
            isNotNull(predictions.computed_at),
            ne(predictions.match_id, matchId)
          )
        )

      const inStage = stagePreds.filter((p) => stageMatchIds.has(p.match_id))

      if (inStage.length > 0) {
        const sum = inStage.reduce((acc, p) => acc + (p.points_awarded ?? 0), 0)
        avgPoints = Math.ceil(sum / inStage.length)
      }
    }

    await db
      .update(predictions)
      .set({ points_awarded: avgPoints, computed_at: new Date() })
      .where(eq(predictions.id, pred.id))

    updated++
  }

  console.log(`[apply-wo] match=${matchId} stage=${match.stage} predictions_updated=${updated}`)
  return { predictions_updated: updated }
}
