'use client'

import { useState } from 'react'
import { useTelegram } from '@/components/providers/telegram-provider'
import { useRanking } from '@/hooks/use-ranking'
import { UserDetailDrawer } from './user-detail-drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'

type TabId = 'geral' | 'grupos' | 'matamat' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'

type TabDef = {
  id: TabId
  label: string
  stages: string[] | undefined
}

const TABS: TabDef[] = [
  { id: 'geral',   label: 'Geral',     stages: undefined },
  { id: 'grupos',  label: 'Grupos',    stages: ['group'] },
  { id: 'matamat', label: 'Mata-mata', stages: ['r32', 'r16', 'qf', 'sf', '3rd', 'final'] },
  { id: 'r32',     label: '16avos',    stages: ['r32'] },
  { id: 'r16',     label: 'Oitavas',   stages: ['r16'] },
  { id: 'qf',      label: 'Quartas',   stages: ['qf'] },
  { id: 'sf',      label: 'Semi',      stages: ['sf'] },
  { id: 'final',   label: 'Final',     stages: ['final'] },
]

function MedalIcon({ position }: { position: number }) {
  if (position > 3) return null
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32']
  const color = colors[position - 1]
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="9" fill={color} />
      <text
        x="10"
        y="14"
        textAnchor="middle"
        fontSize="10"
        fontWeight="bold"
        fill="white"
        fontFamily="sans-serif"
      >
        {position}
      </text>
    </svg>
  )
}

function PositionDelta({ current, prev }: { current: number; prev: number | null }) {
  if (prev === null) return null
  const delta = prev - current
  if (delta === 0) return null
  const up = delta > 0
  return (
    <span
      className={`text-xs font-bold ${up ? 'text-(--color-status-success)' : 'text-(--color-status-danger)'}`}
    >
      {up ? '+' : ''}{delta}
    </span>
  )
}

export function RankingScreen() {
  const { user: me } = useTelegram()
  const [activeTab, setActiveTab] = useState<TabId>('geral')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const activeTabDef = TABS.find((t) => t.id === activeTab)!
  const { data, isLoading } = useRanking(activeTabDef.stages)

  const ranking = data?.ranking ?? []
  const isPhaseFilter = activeTab !== 'geral'
  const allZero = ranking.every((e) => e.total_points === 0)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Sub-tabs */}
      <div className="overflow-x-auto border-b border-(--color-border-base)">
        <div className="flex min-w-max">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-(--color-accent-primary) text-(--color-accent-primary)'
                    : 'border-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 py-6">
        {!isPhaseFilter && allZero && (
          <div className="bg-(--color-bg-surface) rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-(--color-text-secondary)">
              Pontuação será calculada quando a Copa começar. Por enquanto, todos com 0 pontos.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <EmptyState title="Calmo aqui." description="Já já enche." />
        ) : isPhaseFilter && allZero ? (
          // Fase sem dados: lista alfabética sem posições ou medalhas
          <div>
            <p className="text-xs text-(--color-text-secondary) mb-3">
              A fase ainda não começou
            </p>
            <div className="space-y-2">
              {[...ranking]
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .map((entry) => {
                  const isMe = entry.telegram_id === me?.telegram_id
                  return (
                    <button
                      key={entry.user_id}
                      type="button"
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-opacity active:opacity-70 ${
                        isMe ? 'bg-(--color-accent-primary) text-white' : 'bg-(--color-bg-surface)'
                      }`}
                      onClick={() => setSelectedUserId(entry.user_id)}
                    >
                      {/* Espaço reservado no lugar do número/medalha — sem número */}
                      <span className="w-6 shrink-0" />

                      {entry.photo_url ? (
                        <img src={entry.photo_url} alt={entry.name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                          isMe ? 'bg-white/20 text-white' : 'bg-(--color-bg-base) text-(--color-text-primary)'
                        }`}>
                          {entry.name[0]}
                        </div>
                      )}

                      <span className={`flex-1 text-sm font-medium ${isMe ? 'text-white' : 'text-(--color-text-primary)'}`}>
                        {entry.name}
                      </span>

                      <span className={`font-[family-name:var(--font-tight)] font-bold text-sm ${
                        isMe ? 'text-white/60' : 'text-(--color-text-secondary)'
                      }`}>
                        0 pts
                      </span>
                    </button>
                  )
                })}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {ranking.map((entry) => {
              const isMe = entry.telegram_id === me?.telegram_id
              const isTop3 = entry.position <= 3

              return (
                <button
                  key={entry.user_id}
                  type="button"
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-opacity active:opacity-70 ${
                    isMe
                      ? 'bg-(--color-accent-primary) text-white'
                      : 'bg-(--color-bg-surface)'
                  }`}
                  onClick={() => setSelectedUserId(entry.user_id)}
                >
                  <span className="w-6 flex items-center justify-center shrink-0">
                    {isTop3 ? (
                      <MedalIcon position={entry.position} />
                    ) : (
                      <span
                        className={`font-[family-name:var(--font-tight)] font-black text-lg ${
                          isMe ? 'text-white' : 'text-(--color-text-secondary)'
                        }`}
                      >
                        {entry.position}
                      </span>
                    )}
                  </span>

                  {entry.photo_url ? (
                    <img
                      src={entry.photo_url}
                      alt={entry.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                        isMe
                          ? 'bg-white/20 text-white'
                          : 'bg-(--color-bg-base) text-(--color-text-primary)'
                      }`}
                    >
                      {entry.name[0]}
                    </div>
                  )}

                  <span
                    className={`flex-1 text-sm font-medium ${
                      isMe ? 'text-white' : 'text-(--color-text-primary)'
                    }`}
                  >
                    {entry.name}
                  </span>

                  {/* PositionDelta only meaningful in Geral (phase ranking has prev_position=null) */}
                  <PositionDelta current={entry.position} prev={entry.prev_position} />

                  <span
                    className={`font-[family-name:var(--font-tight)] font-bold text-sm ${
                      isMe ? 'text-white' : 'text-(--color-text-primary)'
                    }`}
                  >
                    {entry.total_points} pts
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <UserDetailDrawer
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  )
}
