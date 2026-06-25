import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { tournamentResults, tournamentPredictions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { groupPlayerPredictions } from '@/lib/scoring/group-player-predictions'

// All fields optional — allows partial saves (e.g. player awards before teams are known)
const bodySchema = z
  .object({
    champion_code:          z.string().trim().min(1).optional(),
    runner_up_code:         z.string().trim().min(1).optional(),
    semifinalists:          z.array(z.string().trim().min(1)).length(4).optional(),
    top_scorer_name:        z.string().trim().min(1).optional(),
    best_player_name:       z.string().trim().min(1).optional(),
    best_young_player_name: z.string().trim().min(1).optional(),
  })
  .refine(
    (d) => !d.semifinalists || new Set(d.semifinalists).size === 4,
    { message: 'semifinalists deve ter 4 valores únicos', path: ['semifinalists'] }
  )
  .refine(
    (d) => !d.semifinalists || !d.champion_code || d.semifinalists.includes(d.champion_code),
    { message: 'champion_code deve estar em semifinalists', path: ['champion_code'] }
  )
  .refine(
    (d) => !d.semifinalists || !d.runner_up_code || d.semifinalists.includes(d.runner_up_code),
    { message: 'runner_up_code deve estar em semifinalists', path: ['runner_up_code'] }
  )

// ---------------------------------------------------------------------------
// GET — current results + grouped player predictions
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const adminOrError = await requireAdmin(req)
  if (adminOrError instanceof NextResponse) return adminOrError

  const [results, allPredictions] = await Promise.all([
    db.select().from(tournamentResults).where(eq(tournamentResults.id, 1)).get(),
    db
      .select({
        top_scorer_name:        tournamentPredictions.top_scorer_name,
        best_player_name:       tournamentPredictions.best_player_name,
        best_young_player_name: tournamentPredictions.best_young_player_name,
      })
      .from(tournamentPredictions),
  ])

  const prediction_counts = {
    top_scorer:       groupPlayerPredictions(allPredictions.map((p) => p.top_scorer_name)),
    best_player:      groupPlayerPredictions(allPredictions.map((p) => p.best_player_name)),
    best_young_player: groupPlayerPredictions(allPredictions.map((p) => p.best_young_player_name)),
  }

  return NextResponse.json({ results: results ?? null, prediction_counts })
}

// ---------------------------------------------------------------------------
// POST — partial upsert; does NOT trigger recalculation (explicit admin step)
// ---------------------------------------------------------------------------

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

  const data = parsed.data

  // Build partial update — only include fields present in the request
  const toSet = {
    ...(data.champion_code          !== undefined && { champion_code: data.champion_code }),
    ...(data.runner_up_code         !== undefined && { runner_up_code: data.runner_up_code }),
    ...(data.semifinalists          !== undefined && { semifinalists: JSON.stringify(data.semifinalists) }),
    ...(data.top_scorer_name        !== undefined && { top_scorer_name: data.top_scorer_name }),
    ...(data.best_player_name       !== undefined && { best_player_name: data.best_player_name }),
    ...(data.best_young_player_name !== undefined && { best_young_player_name: data.best_young_player_name }),
    finalized_at: new Date(),
  }

  const existing = await db
    .select()
    .from(tournamentResults)
    .where(eq(tournamentResults.id, 1))
    .get()

  if (existing) {
    await db.update(tournamentResults).set(toSet).where(eq(tournamentResults.id, 1))
  } else {
    await db.insert(tournamentResults).values({ id: 1, ...toSet })
  }

  const updated = await db
    .select()
    .from(tournamentResults)
    .where(eq(tournamentResults.id, 1))
    .get()

  return NextResponse.json({ success: true, results: updated })
}
