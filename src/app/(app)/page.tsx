'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { swrFetcher } from '@/lib/api/client'
import { useTelegram } from '@/components/providers/telegram-provider'
import { useMyPredictions } from '@/hooks/use-my-predictions'
import { getTeamDisplay } from '@/lib/teams'
import type { Match } from '@/lib/db/schema'

function formatKickoff(d: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d))
}

export default function HomePage() {
  const { user, isLoading: userLoading } = useTelegram()
  const { data: matchesData, isLoading: matchesLoading } = useSWR<{ matches: Match[] }>(
    '/api/matches',
    swrFetcher
  )
  const { predictionsMap, isLoading: predsLoading } = useMyPredictions()

  const isLoading = userLoading || matchesLoading || predsLoading

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
        <div className="h-5 w-32 bg-(--color-bg-surface) rounded animate-pulse" />
        <div className="h-20 bg-(--color-bg-surface) rounded-xl animate-pulse" />
        <div className="h-14 bg-(--color-bg-surface) rounded-xl animate-pulse" />
        <div className="h-14 bg-(--color-bg-surface) rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-4 max-w-2xl mx-auto">
      {/* Saudação */}
      <p className="text-(--color-text-secondary) text-sm">
        Olá, {user?.first_name ?? 'participante'}
      </p>

      {/* Card do usuário */}
      <div className="bg-(--color-bg-surface) rounded-xl p-4 flex items-center gap-3">
        {user?.photo_url ? (
          <img
            src={user.photo_url}
            alt={user.first_name}
            className="w-12 h-12 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-(--color-bg-surface) flex items-center justify-center text-lg font-bold text-(--color-text-primary) shrink-0">
            {user?.first_name?.[0] ?? '?'}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-tight)] font-bold text-(--color-text-primary) truncate">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-(--color-text-secondary) text-sm">0 pontos</p>
        </div>
      </div>

      {/* Card de ação dinâmico */}
      {pendingMatches.length > 0 ? (
        <Link
          href="/palpitar"
          className="block bg-(--color-accent-critical) rounded-xl p-4 text-white"
        >
          <p className="font-medium">{pendingMatches.length} jogo{pendingMatches.length > 1 ? 's' : ''} sem palpite</p>
          <p className="text-sm opacity-90 mt-0.5">Toca aqui pra palpitar antes de fechar.</p>
        </Link>
      ) : nextMatch ? (
        <div className="bg-(--color-bg-surface) rounded-xl p-4">
          <p className="text-xs text-(--color-text-secondary) mb-1">Próximo jogo</p>
          <p className="font-medium text-(--color-text-primary) text-sm">
            {getTeamDisplay(nextMatch.home_team_code).flag} {getTeamDisplay(nextMatch.home_team_code).name} vs {getTeamDisplay(nextMatch.away_team_code).name} {getTeamDisplay(nextMatch.away_team_code).flag}
          </p>
          <p className="text-xs text-(--color-text-secondary) mt-1">
            {formatKickoff(nextMatch.kickoff_at)}
          </p>
        </div>
      ) : (
        <Link href="/ranking" className="block bg-(--color-bg-surface) rounded-xl p-4">
          <p className="font-medium text-(--color-text-primary) text-sm">Acompanhe o ranking</p>
          <p className="text-xs text-(--color-text-secondary) mt-0.5">Veja como está a classificação.</p>
        </Link>
      )}

      {/* Próximos 3 jogos */}
      {next3.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wider mb-2">
            Próximos jogos
          </p>
          <div className="space-y-2">
            {next3.map((m) => {
              const pred = predictionsMap.get(m.id)
              return (
                <Link
                  key={m.id}
                  href={`/palpitar?match=${m.id}`}
                  className="flex items-center gap-2 bg-(--color-bg-surface) rounded-xl px-4 py-3"
                >
                  <span className="text-sm text-(--color-text-primary) flex-1 truncate">
                    {getTeamDisplay(m.home_team_code).flag} {getTeamDisplay(m.home_team_code).name} vs {getTeamDisplay(m.away_team_code).name} {getTeamDisplay(m.away_team_code).flag}
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
      )}
    </div>
  )
}
