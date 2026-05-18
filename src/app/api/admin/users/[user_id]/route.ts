import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const bodySchema = z.object({
  is_active: z.boolean().optional(),
  paid_at: z.number().nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  const adminOrError = await requireAdmin(req)
  if (adminOrError instanceof NextResponse) return adminOrError

  const { user_id } = await params
  const userId = Number(user_id)
  if (isNaN(userId)) return NextResponse.json({ error: 'user_id inválido' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { is_active, paid_at } = parsed.data

  const updates: Record<string, unknown> = { updated_at: new Date() }
  if (is_active !== undefined) updates.is_active = is_active
  if (paid_at !== undefined) updates.paid_at = paid_at === null ? null : new Date(paid_at * 1000)

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const existing = await db.select().from(users).where(eq(users.id, userId)).get()
  if (!existing) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  await db.update(users).set(updates).where(eq(users.id, userId))

  const updated = await db.select().from(users).where(eq(users.id, userId)).get()
  return NextResponse.json({ user: updated })
}
