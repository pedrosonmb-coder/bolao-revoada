import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { getUserDetail } from '@/lib/scoring/ranking'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  const userOrError = await requireUser(req)
  if (userOrError instanceof NextResponse) return userOrError

  const { user_id } = await params
  const userId = Number(user_id)

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'user_id inválido' }, { status: 400 })
  }

  const detail = await getUserDetail(userId)
  if (!detail) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  return NextResponse.json(detail)
}
