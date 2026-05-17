import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { validateInitData } from '@/lib/telegram/auth'
import type { User } from '@/lib/db/schema'

export async function requireUser(req: NextRequest): Promise<User | NextResponse> {
  const auth = req.headers.get('Authorization') ?? ''

  // Dev bypass: só em desenvolvimento
  if (process.env.NODE_ENV !== 'production' && auth.startsWith('dev ')) {
    const devUserId = auth.slice(4).trim()
    const user = await db
      .select()
      .from(users)
      .where(eq(users.telegram_id, Number(devUserId)))
      .get()

    if (!user) return NextResponse.json({ error: 'Usuário de dev não encontrado' }, { status: 404 })
    return user
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

  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  return user
}
