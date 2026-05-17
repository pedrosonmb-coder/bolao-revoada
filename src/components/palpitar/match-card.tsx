'use client'

import { useState, useCallback } from 'react'
import { Check, Lock } from 'lucide-react'
import { ScoreSelector } from './score-selector'
import { ClassificationSelector } from './classification-selector'
import { useDebouncedSave } from '@/hooks/use-debounced-save'
import { savePrediction } from '@/lib/api/predictions'
import { useToast } from '@/components/ui/toast'
import { getTeamDisplay } from '@/lib/teams'
import type { Match } from '@/lib/db/schema'
import type { MyPrediction } from '@/hooks/use-my-predictions'

type MatchCardProps = {
  match: Match
  prediction?: MyPrediction
  onSaved?: (matchId: number, homeScore: number, awayScore: number, qtc: string | null) => void
}

function formatKickoff(date: Date | string): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function MatchCard({ match, prediction, onSaved }: MatchCardProps) {
  const { toast } = useToast()
  const now = new Date()
  const isClosed = now >= new Date(match.predictions_close_at)
  const isLive = match.status === 'live'
  const disabled = isClosed || isLive

  const [homeScore, setHomeScore] = useState(prediction?.home_score ?? 0)
  const [awayScore, setAwayScore] = useState(prediction?.away_score ?? 0)
  const [qualifiedCode, setQualifiedCode] = useState<'home' | 'away' | null>(
    (prediction?.qualified_team_code as 'home' | 'away' | null) ?? null
  )
  const [isSaved, setIsSaved] = useState(!!prediction)

  const isKnockout = match.stage !== 'group'
  const isDraw = homeScore === awayScore
  const homeDisplay = getTeamDisplay(match.home_team_code)
  const awayDisplay = getTeamDisplay(match.away_team_code)

  const doSave = useCallback(
    async (hs: number, as_: number, qtc: 'home' | 'away' | null) => {
      try {
        await savePrediction({
          match_id: match.id,
          home_score: hs,
          away_score: as_,
          ...(qtc ? { qualified_team_code: qtc } : {}),
        })
        setIsSaved(true)
        toast('Salvo')
        onSaved?.(match.id, hs, as_, qtc)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar'
        toast(msg, 'error')
      }
    },
    [match.id, toast, onSaved]
  )

  const debouncedSave = useDebouncedSave(
    ({ hs, as_, qtc }: { hs: number; as_: number; qtc: 'home' | 'away' | null }) =>
      doSave(hs, as_, qtc),
    500
  )

  const handleHomeChange = (v: number) => {
    setHomeScore(v)
    setIsSaved(false)
    debouncedSave({ hs: v, as_: awayScore, qtc: qualifiedCode })
  }

  const handleAwayChange = (v: number) => {
    setAwayScore(v)
    setIsSaved(false)
    debouncedSave({ hs: homeScore, as_: v, qtc: qualifiedCode })
  }

  const handleQtcChange = (v: 'home' | 'away') => {
    setQualifiedCode(v)
    setIsSaved(false)
    debouncedSave({ hs: homeScore, as_: awayScore, qtc: v })
  }

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        isLive
          ? 'border-(--color-accent-critical) animate-pulse'
          : isSaved
          ? 'border-(--color-accent-primary)'
          : 'border-(--color-border-base)'
      } bg-(--color-bg-base) relative`}
    >
      {/* Times */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <span className="text-sm font-medium text-(--color-text-primary) flex items-center gap-1.5 min-w-0 flex-1">
          <span className="shrink-0 text-xl leading-none">{homeDisplay.flag}</span>
          <span className="truncate">{homeDisplay.name}</span>
        </span>
        <span className="text-xs text-(--color-text-secondary) shrink-0 px-1">vs</span>
        <span className="text-sm font-medium text-(--color-text-primary) flex items-center gap-1.5 min-w-0 flex-1 justify-end">
          <span className="truncate text-right">{awayDisplay.name}</span>
          <span className="shrink-0 text-xl leading-none">{awayDisplay.flag}</span>
        </span>
      </div>

      {/* Data + status do palpite */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-(--color-text-secondary) mb-4">
        {isClosed && !isLive && <Lock size={12} />}
        {isSaved && !disabled && <Check size={12} className="text-(--color-accent-primary)" />}
        <span>{formatKickoff(match.kickoff_at)}</span>
      </div>

      {/* Seletores de placar */}
      <div className="flex items-center justify-center gap-4">
        <ScoreSelector value={homeScore} onChange={handleHomeChange} disabled={disabled} />
        <span className="text-(--color-text-secondary) font-bold">×</span>
        <ScoreSelector value={awayScore} onChange={handleAwayChange} disabled={disabled} />
      </div>

      {/* Classificação no mata-mata com empate */}
      {isKnockout && isDraw && (
        <ClassificationSelector
          homeTeamCode={match.home_team_code}
          homeTeamName={match.home_team_name}
          awayTeamCode={match.away_team_code}
          awayTeamName={match.away_team_name}
          value={qualifiedCode}
          onChange={handleQtcChange}
          disabled={disabled}
        />
      )}
    </div>
  )
}
