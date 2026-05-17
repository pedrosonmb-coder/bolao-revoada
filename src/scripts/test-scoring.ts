/**
 * Teste end-to-end do sistema de pontuação (Fase 5).
 * Uso: pnpm test:scoring
 *
 * Modifica temporariamente matches 1 e 2 + predictions do user_id=1.
 * Restaura tudo no finally — nunca deixa o banco em estado inconsistente.
 */

import { db } from '@/lib/db'
import { matches, predictions } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { recalculateMatchPredictions } from '@/lib/scoring/recalculate-match-predictions'
import { recalculateAll } from '@/lib/scoring/recalculate-all'
import { getRanking } from '@/lib/scoring/ranking'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0
let failed = 0

function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

type MatchSnapshot = {
  home_score: number | null
  away_score: number | null
  status: string
  result_locked_at: Date | null
}

type PredictionSnapshot = {
  existed: boolean
  id?: number
  home_score?: number
  away_score?: number
  base_points?: number
  classification_bonus?: number
  multiplier?: number
  points_awarded?: number
  computed_at?: Date | null
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Teste E2E — Sistema de pontuação Fase 5 ===\n')

  // -------------------------------------------------------------------------
  // 1. ESTADO INICIAL
  // -------------------------------------------------------------------------
  console.log('1. Salvando estado inicial...')

  const [matchBefore1] = await db.select().from(matches).where(eq(matches.id, 1)).limit(1)
  const [matchBefore2] = await db.select().from(matches).where(eq(matches.id, 2)).limit(1)

  if (!matchBefore1 || !matchBefore2) {
    console.error('ERRO: matches id=1 e/ou id=2 não existem no banco. Seed necessário antes de rodar este script.')
    process.exit(1)
  }

  const snapMatch1: MatchSnapshot = {
    home_score: matchBefore1.home_score,
    away_score: matchBefore1.away_score,
    status: matchBefore1.status,
    result_locked_at: matchBefore1.result_locked_at,
  }
  const snapMatch2: MatchSnapshot = {
    home_score: matchBefore2.home_score,
    away_score: matchBefore2.away_score,
    status: matchBefore2.status,
    result_locked_at: matchBefore2.result_locked_at,
  }

  const predBefore = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.user_id, 1), inArray(predictions.match_id, [1, 2])))

  const snapPred1: PredictionSnapshot = predBefore.find((p) => p.match_id === 1)
    ? { existed: true, ...predBefore.find((p) => p.match_id === 1) }
    : { existed: false }

  const snapPred2: PredictionSnapshot = predBefore.find((p) => p.match_id === 2)
    ? { existed: true, ...predBefore.find((p) => p.match_id === 2) }
    : { existed: false }

  console.log('\n  Estado inicial matches:')
  console.log('  match 1:', JSON.stringify(snapMatch1))
  console.log('  match 2:', JSON.stringify(snapMatch2))
  console.log('\n  Estado inicial predictions (user_id=1):')
  console.log('  pred match_id=1:', JSON.stringify(snapPred1))
  console.log('  pred match_id=2:', JSON.stringify(snapPred2))

  // -------------------------------------------------------------------------
  // EXECUÇÃO (try/finally garante restauração em qualquer caso)
  // -------------------------------------------------------------------------
  try {
    // -----------------------------------------------------------------------
    // 2. PREPARAÇÃO — palpites de teste para user_id=1
    // -----------------------------------------------------------------------
    console.log('\n2. Preparando palpites de teste para user_id=1...')

    // match_id=1: palpite ERRADO (0x1, resultado vai ser 2x1)
    await db
      .insert(predictions)
      .values({
        user_id: 1,
        match_id: 1,
        home_score: 0,
        away_score: 1,
        qualified_team_code: null,
        points_awarded: 0,
        base_points: 0,
        classification_bonus: 0,
        multiplier: 1.0,
        computed_at: null,
      })
      .onConflictDoUpdate({
        target: [predictions.user_id, predictions.match_id],
        set: {
          home_score: 0,
          away_score: 1,
          qualified_team_code: null,
          points_awarded: 0,
          base_points: 0,
          classification_bonus: 0,
          multiplier: 1.0,
          computed_at: null,
        },
      })

    // match_id=2: palpite PLACAR EXATO (2x1, resultado vai ser 2x1)
    await db
      .insert(predictions)
      .values({
        user_id: 1,
        match_id: 2,
        home_score: 2,
        away_score: 1,
        qualified_team_code: null,
        points_awarded: 0,
        base_points: 0,
        classification_bonus: 0,
        multiplier: 1.0,
        computed_at: null,
      })
      .onConflictDoUpdate({
        target: [predictions.user_id, predictions.match_id],
        set: {
          home_score: 2,
          away_score: 1,
          qualified_team_code: null,
          points_awarded: 0,
          base_points: 0,
          classification_bonus: 0,
          multiplier: 1.0,
          computed_at: null,
        },
      })

    console.log('  Palpites inseridos/atualizados.')

    // -----------------------------------------------------------------------
    // CENÁRIO A — Palpite errado
    // -----------------------------------------------------------------------
    console.log('\n--- CENÁRIO A: Palpite errado ---')

    await db
      .update(matches)
      .set({ home_score: 2, away_score: 1, status: 'finished', result_locked_at: new Date() })
      .where(eq(matches.id, 1))

    const resultA = await recalculateMatchPredictions(1)
    console.log(`  recalculateMatchPredictions(1) → updated=${resultA.updated}`)

    const [predA] = await db
      .select()
      .from(predictions)
      .where(and(eq(predictions.user_id, 1), eq(predictions.match_id, 1)))
      .limit(1)

    if (!predA) {
      check('Prediction encontrada', false, 'SELECT retornou vazio')
    } else {
      console.log(
        `  prediction: base_points=${predA.base_points} bonus=${predA.classification_bonus} multiplier=${predA.multiplier} awarded=${predA.points_awarded}`
      )
      check('base_points = 0', predA.base_points === 0, `foi ${predA.base_points}`)
      check('classification_bonus = 0', predA.classification_bonus === 0, `foi ${predA.classification_bonus}`)
      check('multiplier = 1', predA.multiplier === 1.0, `foi ${predA.multiplier}`)
      check('points_awarded = 0', predA.points_awarded === 0, `foi ${predA.points_awarded}`)
      check('computed_at preenchido', predA.computed_at !== null, 'computed_at é null')
    }

    // -----------------------------------------------------------------------
    // CENÁRIO B — Placar exato
    // -----------------------------------------------------------------------
    console.log('\n--- CENÁRIO B: Placar exato ---')

    await db
      .update(matches)
      .set({ home_score: 2, away_score: 1, status: 'finished', result_locked_at: new Date() })
      .where(eq(matches.id, 2))

    const resultB = await recalculateMatchPredictions(2)
    console.log(`  recalculateMatchPredictions(2) → updated=${resultB.updated}`)

    const [predB] = await db
      .select()
      .from(predictions)
      .where(and(eq(predictions.user_id, 1), eq(predictions.match_id, 2)))
      .limit(1)

    if (!predB) {
      check('Prediction encontrada', false, 'SELECT retornou vazio')
    } else {
      console.log(
        `  prediction: base_points=${predB.base_points} bonus=${predB.classification_bonus} multiplier=${predB.multiplier} awarded=${predB.points_awarded}`
      )
      check('base_points = 25', predB.base_points === 25, `foi ${predB.base_points}`)
      check('classification_bonus = 0', predB.classification_bonus === 0, `foi ${predB.classification_bonus}`)
      check('multiplier = 1', predB.multiplier === 1.0, `foi ${predB.multiplier}`)
      check('points_awarded = 25', predB.points_awarded === 25, `foi ${predB.points_awarded}`)
      check('computed_at preenchido', predB.computed_at !== null, 'computed_at é null')
    }

    // -----------------------------------------------------------------------
    // CENÁRIO C — Idempotência
    // -----------------------------------------------------------------------
    console.log('\n--- CENÁRIO C: Idempotência ---')

    await recalculateMatchPredictions(2)
    await recalculateMatchPredictions(2)

    const [predC] = await db
      .select()
      .from(predictions)
      .where(and(eq(predictions.user_id, 1), eq(predictions.match_id, 2)))
      .limit(1)

    if (!predC) {
      check('Prediction encontrada', false, 'SELECT retornou vazio')
    } else {
      console.log(`  points_awarded após 3 execuções: ${predC.points_awarded}`)
      check(
        'points_awarded = 25 (não duplicou)',
        predC.points_awarded === 25,
        `foi ${predC.points_awarded} — possível bug de duplicação`
      )
    }

    // -----------------------------------------------------------------------
    // CENÁRIO D — recalculateAll
    // -----------------------------------------------------------------------
    console.log('\n--- CENÁRIO D: recalculateAll ---')

    const resultD = await recalculateAll()
    console.log('  resultado:', JSON.stringify(resultD))

    check(
      'matches_processed >= 2',
      resultD.matches_processed >= 2,
      `foi ${resultD.matches_processed}`
    )
    check(
      'predictions_updated >= 2',
      resultD.predictions_updated >= 2,
      `foi ${resultD.predictions_updated}`
    )
    check(
      'duration_ms > 0',
      resultD.duration_ms > 0,
      `foi ${resultD.duration_ms}`
    )

    // -----------------------------------------------------------------------
    // CENÁRIO E — Ranking
    // -----------------------------------------------------------------------
    console.log('\n--- CENÁRIO E: Ranking ---')

    const ranking = await getRanking()
    const rankingDisplay = ranking.map((e) => ({
      user_id: e.user_id,
      position: e.position,
      total_points: e.total_points,
      match_points: e.match_points,
    }))
    console.log('  ranking:', JSON.stringify(rankingDisplay, null, 2))

    const user1Entry = ranking.find((e) => e.user_id === 1)

    if (!user1Entry) {
      check('user_id=1 aparece no ranking', false, 'não encontrado')
    } else {
      console.log(
        `  user_id=1: position=${user1Entry.position} total_points=${user1Entry.total_points} match_points=${user1Entry.match_points}`
      )
      check(
        'user_id=1 tem match_points >= 25',
        user1Entry.match_points >= 25,
        `foi ${user1Entry.match_points}`
      )
      check(
        'user_id=1 está em position=1',
        user1Entry.position === 1,
        `está em posição ${user1Entry.position}`
      )
    }
  } finally {
    // -----------------------------------------------------------------------
    // 8. RESTAURAÇÃO
    // -----------------------------------------------------------------------
    console.log('\n=== Restaurando estado original ===')

    let restoreOk = true

    try {
      // Restaura match 1
      await db
        .update(matches)
        .set({
          home_score: snapMatch1.home_score,
          away_score: snapMatch1.away_score,
          status: snapMatch1.status,
          result_locked_at: snapMatch1.result_locked_at,
        })
        .where(eq(matches.id, 1))

      // Restaura match 2
      await db
        .update(matches)
        .set({
          home_score: snapMatch2.home_score,
          away_score: snapMatch2.away_score,
          status: snapMatch2.status,
          result_locked_at: snapMatch2.result_locked_at,
        })
        .where(eq(matches.id, 2))

      // Restaura prediction match_id=1
      if (snapPred1.existed && snapPred1.id) {
        await db
          .update(predictions)
          .set({
            home_score: snapPred1.home_score!,
            away_score: snapPred1.away_score!,
            base_points: snapPred1.base_points!,
            classification_bonus: snapPred1.classification_bonus!,
            multiplier: snapPred1.multiplier!,
            points_awarded: snapPred1.points_awarded!,
            computed_at: snapPred1.computed_at ?? null,
          })
          .where(eq(predictions.id, snapPred1.id))
      } else if (!snapPred1.existed) {
        await db
          .delete(predictions)
          .where(and(eq(predictions.user_id, 1), eq(predictions.match_id, 1)))
      }

      // Restaura prediction match_id=2
      if (snapPred2.existed && snapPred2.id) {
        await db
          .update(predictions)
          .set({
            home_score: snapPred2.home_score!,
            away_score: snapPred2.away_score!,
            base_points: snapPred2.base_points!,
            classification_bonus: snapPred2.classification_bonus!,
            multiplier: snapPred2.multiplier!,
            points_awarded: snapPred2.points_awarded!,
            computed_at: snapPred2.computed_at ?? null,
          })
          .where(eq(predictions.id, snapPred2.id))
      } else if (!snapPred2.existed) {
        await db
          .delete(predictions)
          .where(and(eq(predictions.user_id, 1), eq(predictions.match_id, 2)))
      }

      // Confirma restauração com SELECT
      const [checkM1] = await db.select().from(matches).where(eq(matches.id, 1)).limit(1)
      const [checkM2] = await db.select().from(matches).where(eq(matches.id, 2)).limit(1)

      const m1Ok =
        checkM1.home_score === snapMatch1.home_score &&
        checkM1.away_score === snapMatch1.away_score &&
        checkM1.status === snapMatch1.status
      const m2Ok =
        checkM2.home_score === snapMatch2.home_score &&
        checkM2.away_score === snapMatch2.away_score &&
        checkM2.status === snapMatch2.status

      if (m1Ok && m2Ok) {
        console.log('  ✓ Restaurado — banco voltou ao estado original')
      } else {
        console.log('  ⚠️  Restauração parcial — verifique matches 1 e 2 manualmente')
        restoreOk = false
      }
    } catch (err) {
      restoreOk = false
      console.error('  ❌ ERRO ao restaurar estado original:', err instanceof Error ? err.message : err)
      console.error(
        '\n  Execute manualmente no Turso Studio:\n' +
          '  UPDATE matches SET home_score=NULL, away_score=NULL, status=\'scheduled\', result_locked_at=NULL WHERE id IN (1, 2);\n' +
          '  DELETE FROM predictions WHERE user_id=1 AND match_id IN (1, 2);'
      )
    }

    // -----------------------------------------------------------------------
    // 9. RESUMO FINAL
    // -----------------------------------------------------------------------
    const total = passed + failed
    console.log(`\n=== Resumo: ${passed}/${total} cenários passaram ===`)
    if (!restoreOk) {
      console.log('⚠️  ATENÇÃO: restauração do banco pode estar incompleta — verifique manualmente')
    }

    if (failed > 0 || !restoreOk) {
      process.exit(1)
    }
  }
}

main().catch((err) => {
  console.error('\nErro fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
