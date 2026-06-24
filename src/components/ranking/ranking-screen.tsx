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

// Preposição correta pra cada fase no rótulo de campeão/líder
const PHASE_OF: Record<TabId, string> = {
  geral:   'Geral',
  grupos:  'dos Grupos',
  matamat: 'do Mata-mata',
  r32:     'dos 16avos',
  r16:     'das Oitavas',
  qf:      'das Quartas',
  sf:      'das Semifinais',
  final:   'da Final',
}

function MedalIcon({ position, crowned }: { position: number; crowned?: boolean }) {
  if (position > 3) return null
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32']
  const color = colors[position - 1]
  return (
    <span className="relative inline-flex items-center justify-center">
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
      {crowned && (
        <span className="absolute -top-2 -right-1 text-[10px] leading-none" aria-label="campeão">
          ♛
        </span>
      )}
    </span>
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
  const phaseStatus = data?.phase_status ?? null
  const isPhaseFilter = activeTab !== 'geral'
  const allZero = ranking.every((e) => e.total_points === 0)

  // Champions: entries tied at position 1 (may be >1 in case of true tie)
  const champions = ranking.filter((e) => e.position === 1)
  const leader = ranking[0] ?? null

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
        {/* Banners de status da fase (só em filtros por fase) */}
        {isPhaseFilter && !isLoading && phaseStatus === 'closed' && champions.length > 0 && (
          <div className="bg-(--color-bg-surface) border border-(--color-border-base) rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <span className="text-base" aria-hidden>🏆</span>
            <div className="text-sm">
              <span className="font-semibold text-(--color-text-primary)">
                Campeão {PHASE_OF[activeTab]}:
              </span>{' '}
              <span className="text-(--color-text-primary)">
                {champions.map((c) => c.name).join(' e ')}
              </span>
              {' '}
              <span className="text-(--color-text-secondary)">
                — {champions[0].total_points} pts
              </span>
            </div>
          </div>
        )}

        {isPhaseFilter && !isLoading && phaseStatus === 'in_progress' && leader && (
          <div className="bg-(--color-bg-surface) rounded-xl px-4 py-2.5 mb-4">
            <p className="text-xs text-(--color-text-secondary)">
              Líder parcial {PHASE_OF[activeTab]}:{' '}
              <span className="font-medium text-(--color-text-primary)">{leader.name}</span>
              {' '}— {leader.total_points} pts
            </p>
          </div>
        )}

        {/* Banner de zeros para aba Geral */}
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
        ) : isPhaseFilter && (phaseStatus === 'not_started' || allZero) ? (
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
              const isCrowned = isPhaseFilter && phaseStatus === 'closed' && entry.position === 1

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
                      <MedalIcon position={entry.position} crowned={isCrowned} />
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
