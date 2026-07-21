import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'

export const maxDuration = 60
import { recalculateAll } from '@/lib/scoring/recalculate-all'
import { recalculateMatchPredictions } from '@/lib/scoring/recalculate-match-predictions'
import { recalculateTournamentPredictions } from '@/lib/scoring/recalculate-tournament-predictions'
import { maybeAnnounceOverallChampion } from '@/lib/notifications/phase-champion'
import { z } from 'zod'

const bodySchema = z.object({
  match_id: z.number().int().positive().optional(),
  tournament_only: z.boolean().optional(),
  announce_champion: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const adminOrError = await requireAdmin(req)
  if (adminOrError instanceof NextResponse) return adminOrError

  const confirm = req.headers.get('x-confirm')
  if (confirm !== 'yes') {
    return NextResponse.json(
      { error: 'Operação destrutiva. Inclua header x-confirm: yes pra confirmar.' },
      { status: 400 }
    )
  }

  let body: unknown
  try {
    const text = await req.text()
    body = text ? JSON.parse(text) : {}
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { match_id, tournament_only, announce_champion } = parsed.data

  if (match_id !== undefined) {
    const result = await recalculateMatchPredictions(match_id)
    return NextResponse.json({
      matches_processed: 1,
      predictions_updated: result.updated,
      tournament_updated: 0,
      duration_ms: 0,
    })
  }

  // Pula o loop sequencial dos 104 jogos (estoura os 60s de maxDuration bem antes de
  // chegar aqui) — usado quando os jogos já estão pontuados e só falta o torneio.
  // NÃO anuncia o Campeão Geral — isso é um passo separado (announce_champion), pra dar
  // chance de conferir a pontuação antes do anúncio (idempotente, não tem como desfazer).
  if (tournament_only) {
    const start = Date.now()
    const { updated: tournament_updated } = await recalculateTournamentPredictions()
    const duration_ms = Date.now() - start

    return NextResponse.json({
      matches_processed: 0,
      predictions_updated: 0,
      tournament_updated,
      duration_ms,
    })
  }

  // Segundo passo, disparado manualmente após conferir a pontuação do torneio.
  // Não recalcula nada — só tenta o anúncio (idempotente e com suas próprias
  // pré-condições: final travada, todas as fases de mata-mata fechadas, torneio computado).
  if (announce_champion) {
    await maybeAnnounceOverallChampion()
    return NextResponse.json({ ok: true })
  }

  const result = await recalculateAll()

  // After tournament recalculate, attempt deferred overall champion announcement.
  // Fires only if: final locked, all knockout stages closed, tournament computed,
  // and phase_champion:overall hasn't been sent yet (idempotent via bot_messages).
  if (result.tournament_updated > 0) {
    maybeAnnounceOverallChampion().catch((err) =>
      console.error('[recalculate] maybeAnnounceOverallChampion error:', err)
    )
  }

  return NextResponse.json(result)
}
