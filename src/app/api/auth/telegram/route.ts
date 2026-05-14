import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { validateInitData } from '@/lib/telegram/auth'
import { env } from '@/lib/env'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { initData } = body as { initData?: string }

  if (!initData || typeof initData !== 'string') {
    return NextResponse.json({ error: 'initData is required' }, { status: 400 })
  }

  const telegramUser = validateInitData(initData)

  if (!telegramUser) {
    return NextResponse.json({ error: 'Invalid initData' }, { status: 401 })
  }

  // Verifica se o usuário é admin (telegram_id na lista de ADMIN_TELEGRAM_IDS)
  const adminIds = env.ADMIN_TELEGRAM_IDS.split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id))
  const isAdmin = adminIds.includes(telegramUser.id)

  // Upsert do usuário
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.telegram_id, telegramUser.id))
    .get()

  let user

  if (!existing) {
    const inserted = await db
      .insert(users)
      .values({
        telegram_id: telegramUser.id,
        telegram_username: telegramUser.username ?? null,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name ?? null,
        photo_url: telegramUser.photo_url ?? null,
        is_admin: isAdmin,
        is_active: true,
      })
      .returning()

    user = inserted[0]
  } else {
    const updated = await db
      .update(users)
      .set({
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name ?? null,
        photo_url: telegramUser.photo_url ?? null,
        telegram_username: telegramUser.username ?? null,
        updated_at: new Date(),
      })
      .where(eq(users.telegram_id, telegramUser.id))
      .returning()

    user = updated[0]
  }

  return NextResponse.json({
    user: {
      id: user.id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      is_admin: user.is_admin,
      is_active: user.is_active,
      paid_at: user.paid_at,
      photo_url: user.photo_url,
    },
  })
}
