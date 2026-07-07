import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'

export const maxDuration = 60
import { recalculateAll } from '@/lib/scoring/recalculate-all'
import { recalculateMatchPredictions } from '@/lib/scoring/recalculate-match-predictions'
import { maybeAnnounceOverallChampion } from '@/lib/notifications/phase-champion'
import { z } from 'zod'

const bodySchema = z.object({
  match_id: z.number().int().positive().optional(),
})

export async function POST(req: NextRequest) {
  const adminOrError = await requireAdmin(req)
  if (adminOrError instanceof NextResponse) return adminOrError

  const confirm = req.headers.get('x-confirm')
  if (confirm !== 'yes') {
    return NextResponse.json(
      { error: 'Operação destrutiva. Inclua header x-confirm: yes pra confirmar.' },
      { status: 400 }
    )
  }

  let body: unknown
  try {
    const text = await req.text()
    body = text ? JSON.parse(text) : {}
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { match_id } = parsed.data

  if (match_id !== undefined) {
    const result = await recalculateMatchPredictions(match_id)
    return NextResponse.json({
      matches_processed: 1,
      predictions_updated: result.updated,
      tournament_updated: 0,
      duration_ms: 0,
    })
  }

  const result = await recalculateAll()

  // After tournament recalculate, attempt deferred overall champion announcement.
  // Fires only if: final locked, all knockout stages closed, tournament computed,
  // and phase_champion:overall hasn't been sent yet (idempotent via bot_messages).
  if (result.tournament_updated > 0) {
    maybeAnnounceOverallChampion().catch((err) =>
      console.error('[recalculate] maybeAnnounceOverallChampion error:', err)
    )
  }

  return NextResponse.json(result)
}
