import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { matches, pollingLogs } from '@/lib/db/schema'
import { ne, eq } from 'drizzle-orm'
import { fetchAllMatchesFromFootballData } from '@/lib/data-sources/football-data'
import { verifyCronAuth } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const maxDuration = 60

function mapApiStatus(apiStatus: string): string | null {
  switch (apiStatus) {
    case 'TIMED':
    case 'SCHEDULED':
      return 'scheduled'
    case 'IN_PLAY':
    case 'PAUSED':
      return 'live'
    case 'FINISHED':
      return 'finished'
    case 'POSTPONED':
    case 'SUSPENDED':
      return 'postponed'
    case 'CANCELLED':
      return 'cancelled'
    default:
      return null
  }
}

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  console.log('[poll-fixtures] start')
  const start = Date.now()
  let checked = 0
  let updated = 0
  let postponed = 0
  let cancelled = 0
  let error: string | undefined

  try {
    // 1 request bulk em vez de N requests individuais — elimina rate-limit e timeouts sequenciais
    const apiMatches = await fetchAllMatchesFromFootballData()

    // Lookup map: fd_id → dados da API
    const apiById = new Map<number, Record<string, unknown>>()
    for (const m of apiMatches) {
      const match = m as Record<string, unknown>
      if (typeof match.id === 'number') {
        apiById.set(match.id, match)
      }
    }

    if (apiById.size === 0) {
      const duration_ms = Date.now() - start
      const stats = { checked: 0, updated: 0, postponed: 0, cancelled: 0, duration_ms }
      console.log('[poll-fixtures] end (0 fixtures da API)', stats)
      return NextResponse.json(stats)
    }

    const pending = await db
      .select()
      .from(matches)
      .where(ne(matches.status, 'finished'))

    checked = pending.length

    // Processa cada match independentemente — erro em 1 não derruba os outros
    await Promise.allSettled(
      pending.map(async (match) => {
        try {
          if (!match.fd_id) return

          const apiMatch = apiById.get(match.fd_id)
          if (!apiMatch) return

          const changes: Record<string, unknown> = {}

          const currentKickoff =
            match.kickoff_at instanceof Date
              ? match.kickoff_at.getTime()
              : (match.kickoff_at as number) * 1000

          const apiUtcDate = apiMatch.utcDate as string | undefined
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

          const mappedStatus = mapApiStatus((apiMatch.status as string) ?? '')
          if (mappedStatus === 'postponed' && match.status !== 'postponed') {
            changes.status = 'postponed'
            postponed++
            console.log(`[poll-fixtures] Match ${match.id} adiado`)
          } else if (mappedStatus === 'cancelled' && match.status !== 'cancelled') {
            changes.status = 'cancelled'
            cancelled++
            console.log(`[poll-fixtures] Match ${match.id} cancelado`)
          }

          if (Object.keys(changes).length > 0) {
            await db.update(matches).set(changes).where(eq(matches.id, match.id))
            updated++
          }
        } catch (matchErr) {
          console.error(`[poll-fixtures] Erro no match ${match.id}:`, matchErr)
        }
      })
    )
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    console.error('[poll-fixtures] error', err)
  }

  const duration_ms = Date.now() - start

  try {
    await db.insert(pollingLogs).values({
      ran_at: new Date(),
      endpoint: 'poll-fixtures',
      checked,
      updated,
      duration_ms,
      error,
    })
  } catch (logErr) {
    console.error('[poll-fixtures] Erro ao salvar log:', logErr)
  }

  const stats = { checked, updated, postponed, cancelled, duration_ms }
  console.log('[poll-fixtures] end', stats)
  return NextResponse.json(stats)
}
