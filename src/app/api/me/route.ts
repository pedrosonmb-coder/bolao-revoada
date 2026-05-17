import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { validateInitData } from '@/lib/telegram/auth'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization') ?? ''

  // Dev bypass: só em desenvolvimento
  if (process.env.NODE_ENV !== 'production' && auth.startsWith('dev ')) {
    const devUserId = auth.slice(4).trim()
    const user = await db
      .select()
      .from(users)
      .where(eq(users.telegram_id, Number(devUserId)))
      .get()

    if (!user) {
      return NextResponse.json({ error: 'Usuário de dev não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        last_name: user.last_name,
        photo_url: user.photo_url,
        is_admin: user.is_admin,
        is_active: user.is_active,
        paid_at: user.paid_at,
      },
    })
  }

  if (!auth.startsWith('tma ')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const initData = auth.slice(4)
  const telegramUser = validateInitData(initData)

  if (!telegramUser) {
    return NextResponse.json({ error: 'Autenticação inválida' }, { status: 401 })
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.telegram_id, telegramUser.id))
    .get()

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      last_name: user.last_name,
      photo_url: user.photo_url,
      is_admin: user.is_admin,
      is_active: user.is_active,
      paid_at: user.paid_at,
    },
  })
}
