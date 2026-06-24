'use client'

import { useState, useEffect } from 'react'
import { MatchCard } from './match-card'
import { ProgressBar } from './progress-bar'
import type { Match } from '@/lib/db/schema'
import type { MyPrediction } from '@/hooks/use-my-predictions'

const STAGE_ORDER = ['r32', 'r16', 'qf', 'sf', '3rd', 'final'] as const
type Stage = (typeof STAGE_ORDER)[number]

const STAGE_LABELS: Record<Stage, string> = {
  r32: '16avos',
  r16: 'Oitavas',
  qf: 'Quartas',
  sf: 'Semi',
  '3rd': '3º',
  final: 'Final',
}

type KnockoutListProps = {
  matches: Match[]
  predictionsMap: Map<number, MyPrediction>
  onSaved?: (matchId: number, hs: number, as_: number, qtc: string | null) => void
  isPaid: boolean
  targetMatchId?: number
}

function isDefined(m: Match) {
  return m.home_team_code !== 'TBD' && m.away_team_code !== 'TBD'
}

function getDefaultStage(matches: Match[]): Stage {
  for (const stage of STAGE_ORDER) {
    const hasActive = matches.some(
      (m) => m.stage === stage && isDefined(m) && m.status !== 'finished'
    )
    if (hasActive) return stage
  }
  // All TBD → r32; all finished → final
  return matches.some(isDefined) ? 'final' : 'r32'
}

export function KnockoutList({ matches, predictionsMap, onSaved, isPaid, targetMatchId }: KnockoutListProps) {
  const [activeStage, setActiveStage] = useState<Stage>(() => {
    if (targetMatchId) {
      const targetStage = matches.find((m) => m.id === targetMatchId)?.stage as Stage | undefined
      if (targetStage && STAGE_ORDER.includes(targetStage)) return targetStage
    }
    return getDefaultStage(matches)
  })

  useEffect(() => {
    if (!targetMatchId) return
    const t = setTimeout(() => {
      document.getElementById(`match-${targetMatchId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    return () => clearTimeout(t)
  }, [targetMatchId])

  const byStage = new Map<Stage, Match[]>()
  for (const stage of STAGE_ORDER) byStage.set(stage, [])
  for (const m of matches) {
    const s = m.stage as Stage
    if (byStage.has(s)) byStage.get(s)!.push(m)
  }

  const definedMatches = matches.filter(isDefined)
  const totalDone = definedMatches.filter((m) => predictionsMap.has(m.id)).length
  const activeMatches = byStage.get(activeStage) ?? []

  return (
    <div>
      <ProgressBar done={totalDone} total={definedMatches.length} label="Mata-mata" />

      {/* Sub-tabs por fase */}
      <div className="overflow-x-auto border-b border-(--color-border-base)">
        <div className="flex min-w-max">
          {STAGE_ORDER.map((stage) => {
            const stageMatches = byStage.get(stage) ?? []
            const defined = stageMatches.filter(isDefined)
            const stageDone = defined.filter((m) => predictionsMap.has(m.id)).length
            const counter = defined.length > 0 ? `${stageDone}/${defined.length}` : null
            const isActive = stage === activeStage

            return (
              <button
                key={stage}
                type="button"
                onClick={() => setActiveStage(stage)}
                className={`flex flex-col items-center px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-(--color-accent-primary) text-(--color-accent-primary)'
                    : 'border-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)'
                }`}
              >
                <span>{STAGE_LABELS[stage]}</span>
                <span className="text-[10px] mt-0.5 opacity-70">
                  {counter ?? '—'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Cards da fase selecionada */}
      {activeMatches.length === 0 ? (
        <div className="px-4 py-12 text-center text-(--color-text-secondary) text-sm">
          Nenhum jogo nesta fase ainda.
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {activeMatches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              prediction={predictionsMap.get(m.id)}
              onSaved={onSaved}
              isPaid={isPaid}
              targetMatchId={targetMatchId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
