import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { requireUser } from '@/lib/server/auth'

export async function GET(req: NextRequest) {
  const userOrResponse = await requireUser(req)
  if (userOrResponse instanceof NextResponse) return userOrResponse

  const rows = await db
    .select({
      id: users.id,
      telegram_id: users.telegram_id,
      first_name: users.first_name,
      last_name: users.last_name,
      photo_url: users.photo_url,
    })
    .from(users)
    .where(eq(users.is_active, true))

  return NextResponse.json({ users: rows })
}
