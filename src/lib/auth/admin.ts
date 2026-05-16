import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { env } from '@/lib/env'
import type { User } from '@/lib/db/schema'

export async function requireAdmin(req: NextRequest): Promise<User | NextResponse> {
  const adminId = req.headers.get('x-admin-id')
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = env.ADMIN_TELEGRAM_IDS.split(',').map((s) => s.trim())
  if (!allowed.includes(adminId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [user] = await db.select().from(users).where(eq(users.telegram_id, Number(adminId)))
  if (!user) {
    return NextResponse.json({ error: 'Admin not found' }, { status: 403 })
  }

  return user
}
