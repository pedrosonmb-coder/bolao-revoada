import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { matches, pollingLogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { recalculateMatchPredictions } from '@/lib/scoring/recalculate-match-predictions'
import { checkAndNotifyPhaseOpen } from '@/lib/notifications/phase-open'

const bodySchema = z.object({
  home_score: z.number().int().min(0).max(30),
  away_score: z.number().int().min(0).max(30),
  qualified_team_code: z.enum(['home', 'away']).optional(),
  reason: z.string().min(1),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ match_id: string }> }
) {
  const admin = await requireAdmin(req)
  if (admin instanceof NextResponse) return admin

  const confirm = req.headers.get('x-confirm')
  if (confirm !== 'yes') {
    return NextResponse.json(
      { error: 'Operação destrutiva. Inclua header x-confirm: yes pra confirmar.' },
      { status: 400 }
    )
  }

  const { match_id } = await params
  const matchId = Number(match_id)
  if (isNaN(matchId)) return NextResponse.json({ error: 'match_id inválido' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { home_score, away_score, qualified_team_code, reason } = parsed.data

  const match = await db.select().from(matches).where(eq(matches.id, matchId)).get()
  if (!match) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })

  const isKnockout = match.stage !== 'group'
  if (isKnockout && home_score === away_score && !qualified_team_code) {
    return NextResponse.json(
      { error: 'Jogo de mata-mata com empate requer qualified_team_code' },
      { status: 400 }
    )
  }

  let winner_code: 'home' | 'away' | 'draw' | null = null
  if (home_score > away_score) winner_code = 'home'
  else if (away_score > home_score) winner_code = 'away'
  else if (!isKnockout) winner_code = 'draw'

  await db.update(matches).set({
    home_score,
    away_score,
    qualified_team_code: qualified_team_code ?? null,
    winner_code,
    status: 'finished',
    result_locked_at: new Date(),
    override_by_admin: true,
  }).where(eq(matches.id, matchId))

  await db.insert(pollingLogs).values({
    ran_at: new Date(),
    endpoint: 'admin_override',
    checked: 1,
    updated: 1,
    duration_ms: 0,
    error: null,
  })

  const { updated } = await recalculateMatchPredictions(matchId)

  const updatedMatch = await db.select().from(matches).where(eq(matches.id, matchId)).get()
  if (updatedMatch) {
    checkAndNotifyPhaseOpen(updatedMatch).catch((err) =>
      console.error('[admin/override] checkAndNotifyPhaseOpen erro:', err)
    )
  }

  console.log(`[admin/override] match=${matchId} ${home_score}x${away_score} reason="${reason}" predictions_updated=${updated} admin=${admin.telegram_id}`)

  return NextResponse.json({ success: true, match_id: matchId, predictions_updated: updated })
}
