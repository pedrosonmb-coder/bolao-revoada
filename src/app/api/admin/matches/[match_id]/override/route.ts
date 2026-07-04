import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { matches, pollingLogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { recalculateMatchPredictions } from '@/lib/scoring/recalculate-match-predictions'
import { notifyAfterLock } from '@/lib/notifications/notify-after-lock'
import { resolveOverrideQualifiedTeamCode } from '@/lib/scoring/resolve-override-qtc'

const bodySchema = z.object({
  home_score: z.number().int().min(0).max(30),
  away_score: z.number().int().min(0).max(30),
  home_score_pen: z.number().int().min(0).max(30).optional(),
  away_score_pen: z.number().int().min(0).max(30).optional(),
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

  const { home_score, away_score, home_score_pen, away_score_pen, qualified_team_code, reason } = parsed.data

  const match = await db.select().from(matches).where(eq(matches.id, matchId)).get()
  if (!match) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })

  const isKnockout = match.stage !== 'group'
  const isDraw = home_score === away_score
  if (isKnockout && isDraw && !qualified_team_code) {
    const hasPens = home_score_pen !== undefined && away_score_pen !== undefined
    if (!hasPens) {
      return NextResponse.json(
        { error: 'Empate em mata-mata requer qualified_team_code ou home_score_pen/away_score_pen' },
        { status: 400 }
      )
    }
  }

  const effectiveQTC = resolveOverrideQualifiedTeamCode(
    match.stage,
    home_score,
    away_score,
    home_score_pen ?? null,
    away_score_pen ?? null,
    qualified_team_code
  )

  let winner_code: 'home' | 'away' | 'draw' | null = null
  if (home_score > away_score) winner_code = 'home'
  else if (away_score > home_score) winner_code = 'away'
  else if (!isKnockout) winner_code = 'draw'

  await db.update(matches).set({
    home_score,
    away_score,
    home_score_pen: home_score_pen ?? null,
    away_score_pen: away_score_pen ?? null,
    qualified_team_code: effectiveQTC,
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
    await notifyAfterLock(updatedMatch).catch((err) =>
      console.error('[admin/override] notifyAfterLock erro:', err)
    )
  }

  console.log(`[admin/override] match=${matchId} ${home_score}x${away_score} qtc=${effectiveQTC} reason="${reason}" predictions_updated=${updated} admin=${admin.telegram_id}`)

  return NextResponse.json({ success: true, match_id: matchId, predictions_updated: updated })
}
