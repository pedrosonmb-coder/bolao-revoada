import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { matches } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { validateBracketOverride } from '@/lib/admin/bracket-override'
import { sendNotification } from '@/lib/notifications/send'
import { bracketDefinedMessage } from '@/lib/telegram/messages'
import { env } from '@/lib/env'

const bodySchema = z.object({
  home_team_code: z.string().min(1).max(10).toUpperCase(),
  away_team_code: z.string().min(1).max(10).toUpperCase(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ match_id: string }> }
) {
  const admin = await requireAdmin(req)
  if (admin instanceof NextResponse) return admin

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

  const { home_team_code, away_team_code } = parsed.data

  const match = await db.select().from(matches).where(eq(matches.id, matchId)).get()
  if (!match) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })

  const validation = validateBracketOverride({
    home_team_code,
    away_team_code,
    stage: match.stage,
  })
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: validation.status })
  }

  const { home_name, away_name } = validation

  await db.update(matches).set({
    home_team_code,
    home_team_name: home_name,
    away_team_code,
    away_team_name: away_name,
  }).where(eq(matches.id, matchId))

  console.log(JSON.stringify({
    event: 'admin_bracket_override',
    match_id: matchId,
    home: home_team_code,
    away: away_team_code,
    admin_id: admin.telegram_id,
  }))

  try {
    const text = bracketDefinedMessage(match.stage, [{
      home_team_code,
      home_team_name: home_name,
      away_team_code,
      away_team_name: away_name,
    }])
    await sendNotification({
      type: 'bracket_defined',
      key: `bracket_defined:${match.stage}`,
      chatId: Number(env.TELEGRAM_GROUP_CHAT_ID),
      text,
    })
  } catch (notifErr) {
    console.error('[admin/define-teams] bracket notification failed:', notifErr)
  }

  return NextResponse.json({
    success: true,
    match_id: matchId,
    home_team_code,
    home_team_name: home_name,
    away_team_code,
    away_team_name: away_name,
  })
}
