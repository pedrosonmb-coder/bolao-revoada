import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { tournamentPredictions, phaseWindows } from '@/lib/db/schema'
import { requireUser } from '@/lib/server/auth'

const schema = z.object({
  champion_code: z.string().min(2).max(10),
  runner_up_code: z.string().min(2).max(10),
  semifinalist_1_code: z.string().min(2).max(10),
  semifinalist_2_code: z.string().min(2).max(10),
  top_scorer_name: z.string().min(1).max(100),
  best_player_name: z.string().min(1).max(100),
  best_young_player_name: z.string().min(1).max(100),
})

export async function POST(req: NextRequest) {
  const userOrResponse = await requireUser(req)
  if (userOrResponse instanceof NextResponse) return userOrResponse
  const user = userOrResponse

  if (!user.is_active) {
    return NextResponse.json({ error: 'Conta inativa' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const data = parsed.data

  // Os 4 times (campeão, vice, 2 semis) devem ser distintos
  const teamCodes = [
    data.champion_code,
    data.runner_up_code,
    data.semifinalist_1_code,
    data.semifinalist_2_code,
  ]
  if (new Set(teamCodes).size !== teamCodes.length) {
    return NextResponse.json({ error: 'Campeão, vice e outros semifinalistas devem ser seleções diferentes' }, { status: 400 })
  }

  // Valida janela (usa phase_window stage='group' como proxy para torneio)
  const window = await db.select().from(phaseWindows).where(eq(phaseWindows.stage, 'group')).get()
  if (window) {
    const now = new Date()
    if (now >= window.closes_at) {
      return NextResponse.json({ error: 'Janela de palpites de torneio encerrada' }, { status: 423 })
    }
  }

  // UPSERT em tournament_predictions
  const existing = await db
    .select()
    .from(tournamentPredictions)
    .where(eq(tournamentPredictions.user_id, user.id))
    .get()

  let prediction

  if (existing) {
    const updated = await db
      .update(tournamentPredictions)
      .set({ ...data })
      .where(eq(tournamentPredictions.user_id, user.id))
      .returning()
    prediction = updated[0]
  } else {
    const inserted = await db
      .insert(tournamentPredictions)
      .values({ user_id: user.id, ...data })
      .returning()
    prediction = inserted[0]
  }

  return NextResponse.json({ success: true, prediction })
}
