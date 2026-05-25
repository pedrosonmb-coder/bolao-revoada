import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const ENTRY_FEE = 100

export async function GET(req: NextRequest) {
  const userOrResponse = await requireUser(req)
  if (userOrResponse instanceof NextResponse) return userOrResponse

  const allUsers = await db
    .select({
      id: users.id,
      first_name: users.first_name,
      paid_at: users.paid_at,
      is_active: users.is_active,
    })
    .from(users)
    .where(eq(users.is_active, true))

  const paid = allUsers.filter((u) => !!u.paid_at)
  const pending = allUsers.filter((u) => !u.paid_at)

  const paid_count = paid.length
  const total_count = allUsers.length
  const total_amount = paid_count * ENTRY_FEE

  const prizes = {
    first: Math.round(total_amount * 0.7),
    second: Math.round(total_amount * 0.2),
    third: Math.round(total_amount * 0.1),
  }

  const participants = [
    ...paid
      .sort((a, b) => a.first_name.localeCompare(b.first_name, 'pt-BR'))
      .map((u) => ({ id: u.id, first_name: u.first_name, is_paid: true })),
    ...pending
      .sort((a, b) => a.first_name.localeCompare(b.first_name, 'pt-BR'))
      .map((u) => ({ id: u.id, first_name: u.first_name, is_paid: false })),
  ]

  return NextResponse.json({
    entry_fee: ENTRY_FEE,
    total_amount,
    paid_count,
    total_count,
    prizes,
    participants,
  })
}
