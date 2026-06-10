import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { matches, predictions, predictionHistory } from '@/lib/db/schema'
import { requireUser } from '@/lib/server/auth'
import { isMatchTbd } from '@/lib/poll-fixtures/team-sync'

const predictionSchema = z.object({
  match_id: z.number().int().positive(),
  home_score: z.number().int().min(0).max(9),
  away_score: z.number().int().min(0).max(9),
  qualified_team_code: z.enum(['home', 'away']).optional(),
})

export async function POST(req: NextRequest) {
  const userOrResponse = await requireUser(req)
  if (userOrResponse instanceof NextResponse) return userOrResponse
  const user = userOrResponse

  if (!user.paid_at) {
    return NextResponse.json(
      { error: 'payment_pending', message: 'Pagamento pendente. Palpites bloqueados até confirmação.' },
      { status: 403 },
    )
  }

  if (!user.is_active) {
    return NextResponse.json({ error: 'Conta inativa' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = predictionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const { match_id, home_score, away_score, qualified_team_code } = parsed.data

  const match = await db.select().from(matches).where(eq(matches.id, match_id)).get()
  if (!match) {
    return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })
  }

  if (isMatchTbd(match)) {
    return NextResponse.json(
      { error: 'teams_not_defined', message: 'Confronto ainda não definido. Aguarde os classificados.' },
      { status: 403 },
    )
  }

  const now = new Date()
  if (now >= match.predictions_close_at) {
    return NextResponse.json(
      { error: 'Janela de palpites encerrada para este jogo' },
      { status: 423 }
    )
  }

  // Mata-mata: se empate, qualified_team_code obrigatório
  const isKnockout = match.stage !== 'group'
  const isDraw = home_score === away_score
  let finalQtc: string | null = null

  if (isKnockout && isDraw) {
    if (!qualified_team_code) {
      return NextResponse.json(
        { error: 'No mata-mata com empate, informe quem se classifica' },
        { status: 400 }
      )
    }
    finalQtc = qualified_team_code
  }

  // UPSERT em predictions
  const existing = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.user_id, user.id), eq(predictions.match_id, match_id)))
    .get()

  let prediction

  if (existing) {
    const updated = await db
      .update(predictions)
      .set({
        home_score,
        away_score,
        qualified_team_code: finalQtc,
        updated_at: new Date(),
      })
      .where(eq(predictions.id, existing.id))
      .returning()
    prediction = updated[0]
  } else {
    const inserted = await db
      .insert(predictions)
      .values({
        user_id: user.id,
        match_id,
        home_score,
        away_score,
        qualified_team_code: finalQtc,
      })
      .returning()
    prediction = inserted[0]
  }

  // Histórico
  await db.insert(predictionHistory).values({
    user_id: user.id,
    match_id,
    home_score,
    away_score,
    qualified_team_code: finalQtc,
    source: 'user',
  })

  return NextResponse.json({ success: true, prediction })
}
