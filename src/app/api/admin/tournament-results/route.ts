import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { tournamentResults } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const bodySchema = z
  .object({
    champion_code: z.string().trim().min(1),
    runner_up_code: z.string().trim().min(1),
    semifinalists: z.array(z.string().trim().min(1)).length(4),
    top_scorer_name: z.string().trim().min(1),
    best_player_name: z.string().trim().min(1),
    best_young_player_name: z.string().trim().min(1),
  })
  .refine((d) => new Set(d.semifinalists).size === 4, {
    message: 'semifinalists deve ter 4 valores únicos',
    path: ['semifinalists'],
  })
  .refine((d) => d.semifinalists.includes(d.champion_code), {
    message: 'champion_code deve estar em semifinalists',
    path: ['champion_code'],
  })
  .refine((d) => d.semifinalists.includes(d.runner_up_code), {
    message: 'runner_up_code deve estar em semifinalists',
    path: ['runner_up_code'],
  })

export async function POST(req: NextRequest) {
  const adminOrError = await requireAdmin(req)
  if (adminOrError instanceof NextResponse) return adminOrError

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const {
    champion_code,
    runner_up_code,
    semifinalists,
    top_scorer_name,
    best_player_name,
    best_young_player_name,
  } = parsed.data

  const existing = await db
    .select()
    .from(tournamentResults)
    .where(eq(tournamentResults.id, 1))
    .get()

  if (existing) {
    await db
      .update(tournamentResults)
      .set({
        champion_code,
        runner_up_code,
        semifinalists: JSON.stringify(semifinalists),
        top_scorer_name,
        best_player_name,
        best_young_player_name,
        finalized_at: new Date(),
      })
      .where(eq(tournamentResults.id, 1))
  } else {
    await db.insert(tournamentResults).values({
      id: 1,
      champion_code,
      runner_up_code,
      semifinalists: JSON.stringify(semifinalists),
      top_scorer_name,
      best_player_name,
      best_young_player_name,
      finalized_at: new Date(),
    })
  }

  const results = await db
    .select()
    .from(tournamentResults)
    .where(eq(tournamentResults.id, 1))
    .get()

  return NextResponse.json({ success: true, results })
}
