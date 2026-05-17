'use client'

import { MatchCard } from './match-card'
import { ProgressBar } from './progress-bar'
import type { Match } from '@/lib/db/schema'
import type { MyPrediction } from '@/hooks/use-my-predictions'

const STAGE_LABELS: Record<string, string> = {
  r32: '16-avos de final',
  r16: 'Oitavas de final',
  qf: 'Quartas de final',
  sf: 'Semifinais',
  '3rd': 'Disputa de 3º lugar',
  final: 'Final',
}

type KnockoutListProps = {
  matches: Match[]
  predictionsMap: Map<number, MyPrediction>
  onSaved?: (matchId: number, hs: number, as_: number, qtc: string | null) => void
}

export function KnockoutList({ matches, predictionsMap, onSaved }: KnockoutListProps) {
  // Agrupa por stage mantendo ordem
  const stageOrder = ['r32', 'r16', 'qf', 'sf', '3rd', 'final']
  const byStage = new Map<string, Match[]>()
  for (const m of matches) {
    if (!byStage.has(m.stage)) byStage.set(m.stage, [])
    byStage.get(m.stage)!.push(m)
  }

  // Apenas jogos com times definidos (não TBD)
  const definedMatches = matches.filter(
    (m) => m.home_team_code !== 'TBD' && m.away_team_code !== 'TBD'
  )

  const done = definedMatches.filter((m) => predictionsMap.has(m.id)).length

  return (
    <div>
      <ProgressBar
        done={done}
        total={definedMatches.length}
        label="Mata-mata"
      />

      {matches.length === 0 && (
        <div className="px-4 py-12 text-center text-(--color-text-secondary) text-sm">
          Nenhum jogo nesta fase ainda.
        </div>
      )}

      <div className="px-4 py-4 space-y-6">
        {stageOrder
          .filter((s) => byStage.has(s))
          .map((stage) => (
            <div key={stage}>
              <h3 className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wider mb-3">
                {STAGE_LABELS[stage] ?? stage}
              </h3>
              <div className="space-y-3">
                {byStage.get(stage)!.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    prediction={predictionsMap.get(m.id)}
                    onSaved={onSaved}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
