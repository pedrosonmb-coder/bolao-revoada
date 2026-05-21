'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { swrFetcher } from '@/lib/api/client'
import { useMatches } from '@/hooks/use-matches'
import { useMyPredictions } from '@/hooks/use-my-predictions'
import { usePaymentStatus } from '@/hooks/use-payment-status'
import { GroupsList } from './groups-list'
import { KnockoutList } from './knockout-list'
import { TournamentForm } from './tournament-form'
import type { TournamentPrediction } from '@/lib/db/schema'

const TABS = [
  { id: 'torneio', label: 'Torneio' },
  { id: 'grupos', label: 'Grupos' },
  { id: 'matamat', label: 'Mata-mata' },
] as const

type TabId = (typeof TABS)[number]['id']

const KNOCKOUT_STAGES = ['r32', 'r16', 'qf', 'sf', '3rd', 'final']

export function PalpitarTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('grupos')

  const { matches: allMatches, isLoading: loadingMatches } = useMatches()
  const { predictionsMap, mutate } = useMyPredictions()
  const { isPaid } = usePaymentStatus()
  const { data: tournamentData } = useSWR<{ prediction: TournamentPrediction | null }>(
    '/api/tournament-predictions/my',
    swrFetcher
  )

  const groupMatches = allMatches.filter((m) => m.stage === 'group')
  const knockoutMatches = allMatches.filter((m) => KNOCKOUT_STAGES.includes(m.stage))

  const handleSaved = useCallback(
    (matchId: number, hs: number, as_: number, qtc: string | null) => {
      mutate(
        (prev) => {
          if (!prev) return prev
          const existing = prev.predictions.findIndex((p) => p.match_id === matchId)
          const updated = {
            match_id: matchId,
            home_score: hs,
            away_score: as_,
            qualified_team_code: qtc,
            updated_at: new Date(),
          }
          if (existing >= 0) {
            const preds = [...prev.predictions]
            preds[existing] = updated
            return { predictions: preds }
          }
          return { predictions: [...prev.predictions, updated] }
        },
        false
      )
    },
    [mutate]
  )

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-(--color-border-base) bg-(--color-bg-base) sticky top-12 z-30">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-(--color-accent-primary) text-(--color-accent-primary)'
                : 'border-transparent text-(--color-text-secondary)'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {loadingMatches ? (
        <div className="px-4 py-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-(--color-bg-surface) rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'torneio' && (
            <TournamentForm existing={tournamentData?.prediction ?? null} isPaid={isPaid} />
          )}
          {activeTab === 'grupos' && (
            <GroupsList
              matches={groupMatches}
              predictionsMap={predictionsMap}
              onSaved={handleSaved}
              isPaid={isPaid}
            />
          )}
          {activeTab === 'matamat' && (
            <KnockoutList
              matches={knockoutMatches}
              predictionsMap={predictionsMap}
              onSaved={handleSaved}
              isPaid={isPaid}
            />
          )}
        </>
      )}
    </div>
  )
}
