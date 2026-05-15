import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { matches, pollingLogs } from '@/lib/db/schema'
import { ne } from 'drizzle-orm'
import { fetchMatchFromFootballData } from '@/lib/data-sources/football-data'
import { verifyCronAuth } from '@/lib/cron-auth'

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const start = Date.now()
  let checked = 0
  let updated = 0
  let postponed = 0
  let cancelled = 0
  let error: string | undefined

  try {
    const pending = await db
      .select()
      .from(matches)
      .where(ne(matches.status, 'finished'))

    checked = pending.length

    for (const match of pending) {
      if (!match.fd_id) continue

      const snapshot = await fetchMatchFromFootballData(match.fd_id)
      if (!snapshot) continue

      const changes: Record<string, unknown> = {}

      // Detecta mudança de kickoff
      const currentKickoff =
        match.kickoff_at instanceof Date
          ? match.kickoff_at.getTime()
          : (match.kickoff_at as number) * 1000

      // kickoff_at vem do banco como Date ou unix seconds
      // snapshot.raw_payload contém o utcDate original da API
      const payload = snapshot.raw_payload as Record<string, unknown>
      const apiUtcDate = payload?.utcDate as string | undefined
      if (apiUtcDate) {
        const apiKickoff = new Date(apiUtcDate).getTime()
        if (Math.abs(apiKickoff - currentKickoff) > 60_000) {
          const newKickoff = new Date(apiUtcDate)
          changes.kickoff_at = newKickoff
          changes.predictions_close_at = new Date(newKickoff.getTime() - 5 * 60 * 1000)
          console.log(
            `[poll-fixtures] Match ${match.id} kickoff mudou: ${new Date(currentKickoff).toISOString()} → ${newKickoff.toISOString()}`
          )
        }
      }

      if (snapshot.status === 'postponed' && match.status !== 'postponed') {
        changes.status = 'postponed'
        postponed++
        console.log(`[poll-fixtures] Match ${match.id} adiado`)
      } else if (snapshot.status === 'cancelled' && match.status !== 'cancelled') {
        changes.status = 'cancelled'
        cancelled++
        console.log(`[poll-fixtures] Match ${match.id} cancelado`)
      }

      if (Object.keys(changes).length > 0) {
        const { eq } = await import('drizzle-orm')
        await db.update(matches).set(changes).where(eq(matches.id, match.id))
        updated++
      }
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    console.error('[poll-fixtures] Erro:', error)
  }

  const duration_ms = Date.now() - start

  await db.insert(pollingLogs).values({
    ran_at: new Date(),
    endpoint: 'poll-fixtures',
    checked,
    updated,
    duration_ms,
    error,
  })

  return NextResponse.json({ checked, updated, postponed, cancelled, duration_ms })
}
