'use client'

import useSWR from 'swr'
import { BackButton } from '@/components/layout/back-button'
import { swrFetcher } from '@/lib/api/client'
import { getFlagEmoji } from '@/lib/flags'
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
        <p className="text-(--color-text-secondary) text-sm text-center py-12">
          Nenhum palpite ainda. Coragem.
        </p>
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
                <span className="text-sm flex items-center gap-1.5">
                  <span>{getFlagEmoji(p.match.home_team_code)}</span>
                  {p.match.home_team_code}
                </span>
                <span className="font-[family-name:var(--font-tight)] font-black text-base">
                  {p.home_score} × {p.away_score}
                </span>
                <span className="text-sm flex items-center gap-1.5">
                  {p.match.away_team_code}
                  <span>{getFlagEmoji(p.match.away_team_code)}</span>
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
