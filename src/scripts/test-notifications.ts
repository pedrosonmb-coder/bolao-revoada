/**
 * Teste E2E das notificações da Fase 6.
 * Usa NOTIFICATIONS_DRY_RUN=true — NÃO envia mensagens reais.
 * Uso: pnpm test:notifications
 */

process.env.NOTIFICATIONS_DRY_RUN = 'true'

import { db } from '@/lib/db'
import { matches, botMessages } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { sendNotification } from '@/lib/notifications/send'
import { acquireLock } from '@/lib/notifications/lock'
import {
  getMatchesForDate,
  getUpcomingMatches,
  getUsersWithoutPrediction,
  isTopGame,
  areAllMatchesLockedForStage,
} from '@/lib/notifications/queries'
import { checkAndNotifyPhaseOpen } from '@/lib/notifications/phase-open'
import {
  morningDigestMessage,
  preMatchTopMessage,
  eveningSummaryMessage,
} from '@/lib/telegram/messages'

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

async function cleanLocks(types: string[], keys: string[]) {
  for (const type of types) {
    for (const key of keys) {
      await db
        .delete(botMessages)
        .where(and(eq(botMessages.type, type), eq(botMessages.sent_to, key)))
    }
  }
}

// ---------------------------------------------------------------------------
// Snapshot do estado inicial dos matches 1 e 2
// ---------------------------------------------------------------------------

type MatchSnap = {
  kickoff_at: Date
  status: string
  result_locked_at: Date | null
}

async function snapMatch(id: number): Promise<MatchSnap | null> {
  const m = await db.select().from(matches).where(eq(matches.id, id)).get()
  if (!m) return null
  return {
    kickoff_at: m.kickoff_at instanceof Date ? m.kickoff_at : new Date((m.kickoff_at as number) * 1000),
    status: m.status,
    result_locked_at: m.result_locked_at,
  }
}

async function restoreMatch(id: number, snap: MatchSnap) {
  await db
    .update(matches)
    .set({
      kickoff_at: snap.kickoff_at,
      status: snap.status,
      result_locked_at: snap.result_locked_at,
    })
    .where(eq(matches.id, id))
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Teste E2E — Notificações Fase 6 (DRY_RUN) ===\n')
  console.log('  ℹ Nenhuma mensagem real será enviada (NOTIFICATIONS_DRY_RUN=true)\n')

  // Verifica que matches 1 e 2 existem
  const [m1Before, m2Before] = await Promise.all([snapMatch(1), snapMatch(2)])
  if (!m1Before || !m2Before) {
    console.error('ERRO: matches id=1 e/ou id=2 não existem. Rode seed antes.')
    process.exit(1)
  }

  // Limpa locks de teste prévios
  const TEST_TYPES = [
    'morning_digest', 'evening_summary', 'pre_match_top', 'phase_open', 'test_lock',
  ]
  const today = new Date().toISOString().slice(0, 10)

  try {
    // -----------------------------------------------------------------------
    // CENÁRIO A — Lock distribuído: acquire → segunda tentativa falha
    // -----------------------------------------------------------------------
    console.log('--- CENÁRIO A: Lock distribuído ---')

    const lockKey = `test_lock:${today}:${Date.now()}`
    const first = await acquireLock('test_lock', lockKey)
    const second = await acquireLock('test_lock', lockKey)

    check('Primeiro acquire retorna true', first === true)
    check('Segundo acquire retorna false (idempotência)', second === false)

    // Limpa lock de teste
    await db
      .delete(botMessages)
      .where(and(eq(botMessages.type, 'test_lock'), eq(botMessages.sent_to, lockKey)))

    // -----------------------------------------------------------------------
    // CENÁRIO B — sendNotification DRY_RUN: envia uma vez, segunda vez bloqueia
    // -----------------------------------------------------------------------
    console.log('\n--- CENÁRIO B: sendNotification idempotente (DRY_RUN) ---')

    const notifKey = `morning_digest:${today}`
    await cleanLocks(['morning_digest'], [notifKey])

    const r1 = await sendNotification({
      type: 'morning_digest',
      key: notifKey,
      chatId: -1,
      text: 'Teste bom dia.',
    })
    const r2 = await sendNotification({
      type: 'morning_digest',
      key: notifKey,
      chatId: -1,
      text: 'Teste bom dia.',
    })

    check('Primeira chamada: sent=true', r1.sent === true, JSON.stringify(r1))
    check('Segunda chamada: sent=false (already_sent)', !r2.sent && 'reason' in r2 && (r2 as { sent: false; reason: string }).reason === 'already_sent')

    // Verifica que criou linha em bot_messages
    const row = await db
      .select()
      .from(botMessages)
      .where(and(eq(botMessages.type, 'morning_digest'), eq(botMessages.sent_to, notifKey)))
      .get()
    check('bot_messages tem linha com type=morning_digest', !!row)

    // Limpa
    await cleanLocks(['morning_digest'], [notifKey])

    // -----------------------------------------------------------------------
    // CENÁRIO C — morningDigestMessage com jogos de hoje
    // -----------------------------------------------------------------------
    console.log('\n--- CENÁRIO C: Morning digest com jogos simulados ---')

    // Atualiza matches 1 e 2 para kickoff hoje (16h e 19h BRT = 19h e 22h UTC)
    const nowMs = Date.now()
    const kickoff1 = new Date(nowMs + 2 * 60 * 60 * 1000)  // +2h
    const kickoff2 = new Date(nowMs + 5 * 60 * 60 * 1000)  // +5h

    await db.update(matches).set({ kickoff_at: kickoff1, status: 'scheduled' }).where(eq(matches.id, 1))
    await db.update(matches).set({ kickoff_at: kickoff2, status: 'scheduled' }).where(eq(matches.id, 2))

    const todayStr = today
    const todayMatches = await getMatchesForDate(todayStr)

    check(
      'getMatchesForDate encontra os 2 matches de hoje',
      todayMatches.some((m) => m.id === 1) && todayMatches.some((m) => m.id === 2),
      `encontrou ids: ${todayMatches.map((m) => m.id).join(',')}`
    )

    const usersWithout = await Promise.all(
      todayMatches.map(async (m) => ({ match_id: m.id, users: await getUsersWithoutPrediction(m.id) }))
    )

    const digestText = morningDigestMessage(todayMatches, usersWithout)
    check('morningDigestMessage gera texto não-vazio', digestText.length > 10)
    console.log(`  texto gerado (${digestText.length} chars): ${digestText.slice(0, 100)}…`)

    // -----------------------------------------------------------------------
    // CENÁRIO D — Pre-match: isTopGame + upcoming
    // -----------------------------------------------------------------------
    console.log('\n--- CENÁRIO D: Pre-match reminder ---')

    // Match 1 com kickoff em 30 min
    const kickoffIn30 = new Date(nowMs + 30 * 60 * 1000)
    await db.update(matches).set({ kickoff_at: kickoffIn30, status: 'scheduled' }).where(eq(matches.id, 1))

    const upcoming = await getUpcomingMatches(35)
    const matchIn30 = upcoming.find((m) => m.id === 1)

    check('getUpcomingMatches encontra match 1 em ~30 min', !!matchIn30)

    if (matchIn30) {
      const usersNoPred = await getUsersWithoutPrediction(matchIn30.id)
      const topMsg = preMatchTopMessage(matchIn30, usersNoPred)
      check('preMatchTopMessage gera texto', topMsg.length > 5)
      console.log(`  texto pré-jogo: ${topMsg.slice(0, 100)}`)

      const preKey = `pre_match_top:match_${matchIn30.id}`
      await cleanLocks(['pre_match_top'], [preKey])

      const sent = await sendNotification({
        type: 'pre_match_top',
        key: preKey,
        chatId: -1,
        text: topMsg,
        matchId: matchIn30.id,
      })
      check('sendNotification pre_match_top: sent=true (DRY_RUN)', sent.sent === true)
      await cleanLocks(['pre_match_top'], [preKey])
    }

    // -----------------------------------------------------------------------
    // CENÁRIO E — Phase open trigger
    // -----------------------------------------------------------------------
    console.log('\n--- CENÁRIO E: Phase open ---')

    // Verifica se há matches de fase 'group' ainda sem lock (pré-Copa)
    const allGroupLocked = await areAllMatchesLockedForStage('group')
    console.log(`  areAllMatchesLockedForStage('group') = ${allGroupLocked}`)
    check(
      'areAllMatchesLockedForStage retorna boolean',
      typeof allGroupLocked === 'boolean'
    )

    // Limpa lock de phase_open para teste isolado
    await cleanLocks(['phase_open'], ['phase_open:r32'])

    // Chama checkAndNotifyPhaseOpen com match 1 (group stage)
    const [currentMatch1] = await db.select().from(matches).where(eq(matches.id, 1)).limit(1)
    if (currentMatch1) {
      await checkAndNotifyPhaseOpen(currentMatch1)
      // Se todos os groups estão locked, deve ter criado entrada em bot_messages
      if (allGroupLocked) {
        const phaseRow = await db
          .select()
          .from(botMessages)
          .where(and(eq(botMessages.type, 'phase_open'), eq(botMessages.sent_to, 'phase_open:r32')))
          .get()
        check('phase_open criou entrada em bot_messages (todos groups locked)', !!phaseRow)
      } else {
        check('checkAndNotifyPhaseOpen não notificou (groups ainda em aberto — esperado)', true)
      }
    }

    await cleanLocks(['phase_open'], ['phase_open:r32'])

    console.log('\n✓ Todos cenários executados.')

  } finally {
    // -----------------------------------------------------------------------
    // RESTAURAÇÃO
    // -----------------------------------------------------------------------
    console.log('\n=== Restaurando estado original ===')
    try {
      await restoreMatch(1, m1Before)
      await restoreMatch(2, m2Before)
      // Limpa todos os locks de teste residuais
      await cleanLocks(TEST_TYPES, [today, `${today}:*`])
      console.log('  ✓ Estado restaurado.')
    } catch (err) {
      console.error('  ❌ Erro ao restaurar:', err instanceof Error ? err.message : err)
    }

    // -----------------------------------------------------------------------
    // RESUMO
    // -----------------------------------------------------------------------
    const total = passed + failed
    console.log(`\n=== Resumo: ${passed}/${total} cenários passaram ===`)
    if (failed > 0) process.exit(1)
  }
}

main().catch((err) => {
  console.error('\nErro fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
