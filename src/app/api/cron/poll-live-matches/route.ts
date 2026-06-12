import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { matches, pollingLogs } from '@/lib/db/schema'
import { and, isNull, inArray, lte } from 'drizzle-orm'
import { reconcileMatch, applyReconciliation } from '@/lib/reconciliation'
import { verifyCronAuth } from '@/lib/cron-auth'

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const start = Date.now()
  let checked = 0
  let updated = 0
  let locked = 0
  let conflicts = 0
  let error: string | undefined

  try {
    const cutoff = new Date(Date.now() + 30 * 60 * 1000) // now + 30min

    const pending = await db
      .select()
      .from(matches)
      .where(
        and(
          lte(matches.kickoff_at, cutoff),
          isNull(matches.result_locked_at),
          inArray(matches.status, ['scheduled', 'live', 'finished'])
        )
      )

    checked = pending.length

    // Processa em batches de 5
    for (let i = 0; i < pending.length; i += 5) {
      const batch = pending.slice(i, i + 5)
      await Promise.all(
        batch.map(async (match) => {
          const result = await reconcileMatch(match)
          if (result.kind === 'conflict') {
            conflicts++
            return
          }
          const { updated: wasUpdated, locked: wasLocked } =
            await applyReconciliation(match.id, result)
          if (wasUpdated) updated++
          if (wasLocked) locked++
        })
      )
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    console.error('[poll-live-matches] Erro:', error)
  }

  const duration_ms = Date.now() - start

  await db.insert(pollingLogs).values({
    ran_at: new Date(),
    endpoint: 'poll-live-matches',
    checked,
    updated,
    locked,
    conflicts,
    duration_ms,
    error,
  })

  return NextResponse.json({ checked, updated, locked, conflicts, duration_ms })
}
