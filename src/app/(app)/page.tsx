'use client'

import useSWR from 'swr'
import { swrFetcher } from '@/lib/api/client'
import { useTelegram } from '@/components/providers/telegram-provider'
import { useRanking } from '@/hooks/use-ranking'
import { getDisplayName } from '@/lib/display-name'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { UpcomingMatchRow, type UpcomingMatch } from '@/components/home/upcoming-match-row'
import { RecentResultRow, type RecentResult } from '@/components/home/recent-result-row'
import Link from 'next/link'

type UpcomingResponse = { upcoming: UpcomingMatch[]; total_pending: number }
type RecentResponse = { results: RecentResult[] }

export default function HomePage() {
  const { user, isLoading: userLoading } = useTelegram()
  const { data: rankingData, isLoading: rankingLoading } = useRanking()
  const { data: upcomingData, isLoading: upcomingLoading } = useSWR<UpcomingResponse>(
    '/api/matches/upcoming-with-status',
    swrFetcher
  )
  const { data: recentData, isLoading: recentLoading } = useSWR<RecentResponse>(
    '/api/matches/recent-results',
    swrFetcher
  )

  const myRankingEntry = rankingData?.ranking.find(
    (e) => e.telegram_id === user?.telegram_id
  )

  const totalPending = upcomingData?.total_pending ?? 0
  const upcomingMatches = upcomingData?.upcoming ?? []
  const recentResults = recentData?.results ?? []

  const isHeaderLoading = userLoading || rankingLoading

  return (
    <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
      <h1 className="font-[family-name:var(--font-tight)] font-black text-2xl uppercase tracking-wide text-(--color-text-primary)">
        Início
      </h1>

      {/* Card identidade */}
      {isHeaderLoading ? (
        <Skeleton className="h-20 rounded-2xl" />
      ) : (
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
              {user ? getDisplayName(user) : ''}
            </p>
            <p className="text-(--color-text-secondary) text-sm">
              {myRankingEntry
                ? `${myRankingEntry.total_points} pts · #${myRankingEntry.position}º lugar`
                : '0 pts'}
            </p>
          </div>
        </div>
      )}

      {/* CTA palpites pendentes */}
      {!upcomingLoading && totalPending > 0 && (
        <Link
          href="/palpitar"
          className="block bg-(--color-accent-critical) rounded-2xl p-5 text-white shadow-[0_4px_12px_rgba(225,6,0,0.25)]"
        >
          <p className="font-[family-name:var(--font-tight)] font-black text-lg">
            {totalPending} jogo{totalPending > 1 ? 's' : ''} sem palpite
          </p>
          <p className="text-sm opacity-90 mt-1">Toca aqui pra palpitar antes de fechar.</p>
        </Link>
      )}

      {/* Próximos jogos */}
      <section>
        <h2 className="font-[family-name:var(--font-tight)] font-bold text-xs uppercase tracking-wider text-(--color-text-secondary) mb-3">
          Próximos jogos
        </h2>
        {upcomingLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : upcomingMatches.length === 0 ? (
          <EmptyState title="Sem jogos agendados" description="Próximos jogos aparecerão aqui." />
        ) : (
          <Card variant="flat" className="!p-0 overflow-hidden">
            <div className="divide-y divide-(--color-border-base)">
              {upcomingMatches.map((match) => (
                <UpcomingMatchRow key={match.id} match={match} />
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* Últimos resultados — só renderiza se há ao menos 1 jogo finished */}
      {!recentLoading && recentResults.length > 0 && (
        <section>
          <h2 className="font-[family-name:var(--font-tight)] font-bold text-xs uppercase tracking-wider text-(--color-text-secondary) mb-3">
            Últimos resultados
          </h2>
          <Card variant="flat" className="!p-0 overflow-hidden">
            <div className="divide-y divide-(--color-border-base)">
              {recentResults.map((match) => (
                <RecentResultRow key={match.id} match={match} />
              ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  )
}
