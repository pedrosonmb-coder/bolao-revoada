'use client'

import useSWR from 'swr'
import { BackButton } from '@/components/layout/back-button'
import { swrFetcher } from '@/lib/api/client'
import { getTeamDisplay } from '@/lib/teams'
import { EmptyState } from '@/components/ui/empty-state'
import type { Match } from '@/lib/db/schema'
import type { MyPrediction } from '@/hooks/use-my-predictions'

type HistoricoData = {
  predictions: (MyPrediction & { match: Match })[]
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Fase de grupos',
  r32: '16-avos',
  r16: 'Oitavas',
  qf: 'Quartas',
  sf: 'Semifinais',
  '3rd': '3º lugar',
  final: 'Final',
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d))
}

export default function HistoricoPage() {
  const { data, isLoading } = useSWR<HistoricoData>('/api/predictions/history', swrFetcher)

  const byStage = new Map<string, HistoricoData['predictions'][number][]>()
  for (const p of data?.predictions ?? []) {
    const key = p.match.stage
    if (!byStage.has(key)) byStage.set(key, [])
    byStage.get(key)!.push(p)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <BackButton fallbackHref="/mais" />
      <h1 className="font-[family-name:var(--font-tight)] font-black text-xl uppercase mb-6">
        Histórico de palpites
      </h1>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-(--color-bg-surface) rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (data?.predictions?.length ?? 0) === 0 && (
        <EmptyState
          title="Sem palpites ainda. Vergonha."
          action={{ label: 'Palpitar agora', href: '/palpitar' }}
        />
      )}

      {Array.from(byStage.entries()).map(([stage, preds]) => (
        <div key={stage} className="mb-6">
          <h2 className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wider mb-3">
            {STAGE_LABELS[stage] ?? stage}
          </h2>
          <div className="space-y-2">
            {preds.map((p) => (
              <div
                key={p.match_id}
                className="bg-(--color-bg-surface) rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <span className="flex items-center gap-1 min-w-0">
                  <span className="text-lg leading-none shrink-0">{getTeamDisplay(p.match.home_team_code).flag}</span>
                  <span className="text-xs text-(--color-text-primary) truncate">{getTeamDisplay(p.match.home_team_code).name}</span>
                </span>
                <span className="font-[family-name:var(--font-tight)] font-black text-base shrink-0">
                  {p.home_score} × {p.away_score}
                </span>
                <span className="flex items-center gap-1 min-w-0 justify-end">
                  <span className="text-xs text-(--color-text-primary) truncate">{getTeamDisplay(p.match.away_team_code).name}</span>
                  <span className="text-lg leading-none shrink-0">{getTeamDisplay(p.match.away_team_code).flag}</span>
                </span>
                {p.updated_at && (
                  <span className="ml-auto text-xs text-(--color-text-secondary)">
                    {formatDate(p.updated_at)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
