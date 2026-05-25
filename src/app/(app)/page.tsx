'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { swrFetcher } from '@/lib/api/client'
import { useTelegram } from '@/components/providers/telegram-provider'
import { useMyPredictions } from '@/hooks/use-my-predictions'
import { useRanking } from '@/hooks/use-ranking'
import { getTeamDisplay } from '@/lib/teams'
import { formatKickoff } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import type { Match } from '@/lib/db/schema'

export default function HomePage() {
  const { user, isLoading: userLoading } = useTelegram()
  const { data: matchesData, isLoading: matchesLoading } = useSWR<{ matches: Match[] }>(
    '/api/matches',
    swrFetcher
  )
  const { predictionsMap, isLoading: predsLoading } = useMyPredictions()
  const { data: rankingData, isLoading: rankingLoading } = useRanking()

  const isLoading = userLoading || matchesLoading || predsLoading || rankingLoading

  const myRankingEntry = rankingData?.ranking.find(
    (e) => e.telegram_id === user?.telegram_id
  )

  const now = new Date()
  const upcomingOpen = (matchesData?.matches ?? [])
    .filter((m) => new Date(m.predictions_close_at) > now && m.status === 'scheduled')
    .sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())

  const pendingMatches = upcomingOpen.filter((m) => !predictionsMap.has(m.id))
  const nextMatch = upcomingOpen[0]

  const next3 = (matchesData?.matches ?? [])
    .filter((m) => m.status === 'scheduled')
    .sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())
    .slice(0, 3)

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
      <h1 className="font-[family-name:var(--font-tight)] font-black text-2xl uppercase tracking-wide text-(--color-text-primary)">
        Início
      </h1>

      {/* Card do usuário */}
      <div className="bg-(--color-bg-surface) border border-(--color-border-base) rounded-2xl p-4 flex items-center gap-3 shadow-[var(--shadow-card)]">
        {user?.photo_url ? (
          <img
            src={user.photo_url}
            alt={user.first_name}
            className="w-12 h-12 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-(--color-bg-base) border border-(--color-border-base) flex items-center justify-center text-lg font-bold text-(--color-text-primary) shrink-0">
            {user?.first_name?.[0] ?? '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--font-tight)] font-bold text-(--color-text-primary) truncate">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-(--color-text-secondary) text-sm">
            {myRankingEntry
              ? `${myRankingEntry.total_points} pts · #${myRankingEntry.position}º lugar`
              : '0 pts'}
          </p>
        </div>
      </div>

      {/* Card de ação dinâmico */}
      {pendingMatches.length > 0 ? (
        <Link
          href="/palpitar"
          className="block bg-(--color-accent-critical) rounded-2xl p-5 text-white shadow-[0_4px_12px_rgba(225,6,0,0.25)]"
        >
          <p className="font-[family-name:var(--font-tight)] font-black text-lg">
            {pendingMatches.length} jogo{pendingMatches.length > 1 ? 's' : ''} sem palpite
          </p>
          <p className="text-sm opacity-90 mt-1">Toca aqui pra palpitar antes de fechar.</p>
        </Link>
      ) : nextMatch ? (
        <div className="bg-(--color-bg-surface) border border-(--color-border-base) rounded-2xl p-4 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wider mb-2">Próximo jogo</p>
          <p className="font-medium text-(--color-text-primary) text-sm">
            {getTeamDisplay(nextMatch.home_team_code).flag} {getTeamDisplay(nextMatch.home_team_code).name}
            {' vs '}
            {getTeamDisplay(nextMatch.away_team_code).name} {getTeamDisplay(nextMatch.away_team_code).flag}
          </p>
          <p className="text-xs text-(--color-text-secondary) mt-1">
            {formatKickoff(nextMatch.kickoff_at)}
          </p>
        </div>
      ) : (
        <Link href="/ranking" className="block bg-(--color-bg-surface) border border-(--color-border-base) rounded-2xl p-4 shadow-[var(--shadow-card)]">
          <p className="font-medium text-(--color-text-primary) text-sm">Acompanhe o ranking</p>
          <p className="text-xs text-(--color-text-secondary) mt-0.5">Veja como está a classificação.</p>
        </Link>
      )}

      {/* Próximos 3 jogos */}
      {next3.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wider mb-3">
            Próximos jogos
          </p>
          <div className="space-y-2">
            {next3.map((m) => {
              const pred = predictionsMap.get(m.id)
              return (
                <Link
                  key={m.id}
                  href="/palpitar"
                  className="flex items-center gap-2 bg-(--color-bg-surface) border border-(--color-border-base) rounded-xl px-4 py-3"
                >
                  <span className="text-sm text-(--color-text-primary) flex-1 truncate">
                    {getTeamDisplay(m.home_team_code).flag} {getTeamDisplay(m.home_team_code).name}
                    {' vs '}
                    {getTeamDisplay(m.away_team_code).name} {getTeamDisplay(m.away_team_code).flag}
                  </span>
                  <span className="text-xs text-(--color-text-secondary) shrink-0">
                    {formatKickoff(m.kickoff_at)}
                  </span>
                  {pred ? (
                    <span className="text-xs font-[family-name:var(--font-tight)] font-bold text-(--color-accent-primary) shrink-0">
                      {pred.home_score}×{pred.away_score}
                    </span>
                  ) : (
                    <span className="text-xs text-(--color-text-secondary) shrink-0">—</span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ) : (
        !pendingMatches.length && !nextMatch && (
          <EmptyState title="Sem jogos agendados" description="Próximos palpites aparecerão aqui." />
        )
      )}
    </div>
  )
}
