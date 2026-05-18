import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { matches, pollingLogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { applyWO } from '@/lib/scoring/apply-wo'

const bodySchema = z.object({
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

  const { reason } = parsed.data

  const match = await db.select().from(matches).where(eq(matches.id, matchId)).get()
  if (!match) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })
  if (match.status === 'cancelled') {
    return NextResponse.json({ error: 'Jogo já está cancelado' }, { status: 400 })
  }

  await db.update(matches).set({
    status: 'cancelled',
    result_locked_at: new Date(),
  }).where(eq(matches.id, matchId))

  const { predictions_updated } = await applyWO(matchId)

  await db.insert(pollingLogs).values({
    ran_at: new Date(),
    endpoint: 'admin_cancel',
    checked: 1,
    updated: predictions_updated,
    duration_ms: 0,
    error: null,
  })

  console.log(`[admin/cancel] match=${matchId} reason="${reason}" wo_predictions=${predictions_updated} admin=${admin.telegram_id}`)

  return NextResponse.json({ success: true, match_id: matchId, predictions_updated })
}
