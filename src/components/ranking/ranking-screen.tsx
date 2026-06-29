'use client'

import { useState } from 'react'
import { useTelegram } from '@/components/providers/telegram-provider'
import { useRanking } from '@/hooks/use-ranking'
import type { BadgeId, ChampionsMap } from '@/hooks/use-ranking'
import { UserDetailDrawer } from './user-detail-drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'

type TabId = 'geral' | 'grupos' | 'matamat' | 'torneio'

type TabDef = {
  id: TabId
  label: string
  stages?: string[]
  mode?: 'tournament'
  emptyText: string
  phaseOf: string
}

const TABS: TabDef[] = [
  {
    id: 'geral',
    label: 'Geral',
    emptyText: 'Pontuação será calculada quando a Copa começar. Por enquanto, todos com 0 pontos.',
    phaseOf: 'Geral',
  },
  {
    id: 'grupos',
    label: 'Grupos',
    stages: ['group'],
    emptyText: 'A fase ainda não começou.',
    phaseOf: 'dos Grupos',
  },
  {
    id: 'matamat',
    label: 'Mata-mata',
    stages: ['r32', 'r16', 'qf', 'sf', '3rd', 'final'],
    emptyText: 'A fase ainda não começou.',
    phaseOf: 'do Mata-mata',
  },
  {
    id: 'torneio',
    label: 'Torneio',
    mode: 'tournament',
    emptyText: 'O ranking de Torneio é pontuado no fim da Copa.',
    phaseOf: 'do Torneio',
  },
]

const BADGE_ICONS: Record<BadgeId, string> = {
  champion_group:    '🏅',
  champion_knockout: '⚔️',
  champion_overall:  '🏆',
  champion_brazil:   '🇧🇷',
}

function BadgeIcons({ badges }: { badges: BadgeId[] | undefined }) {
  if (!badges?.length) return null
  return (
    <span className="text-xs ml-1 leading-none" aria-label="selos">
      {badges.map((b) => BADGE_ICONS[b]).join('')}
    </span>
  )
}

type MuralSection = { label: string; entries: { name: string; total_points: number }[] | null }

function MuralCard({ champions }: { champions: ChampionsMap | undefined }) {
  const [open, setOpen] = useState(false)

  if (!champions) return null
  const hasAny = Object.values(champions).some((v) => v !== null)
  if (!hasAny) return null

  const sections: MuralSection[] = [
    { label: 'Campeão Geral',        entries: champions.overall },
    { label: 'Campeão dos Grupos',   entries: champions.group },
    { label: 'Campeão do Mata-mata', entries: champions.knockout },
    { label: 'Campeão do Brasil',    entries: champions.brazil },
    { label: 'Campeão do Torneio',   entries: champions.tournament },
  ]

  return (
    <div className="bg-(--color-bg-surface) border border-(--color-border-base) rounded-xl mb-4 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-sm font-semibold text-(--color-text-primary)">🏆 Mural de Conquistas</span>
        <span className="text-(--color-text-secondary) text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-(--color-border-base) pt-3">
          {sections.map(({ label, entries }) => (
            <div key={label} className="flex items-start gap-2 text-xs">
              <span className="text-(--color-text-secondary) w-40 shrink-0">{label}</span>
              {entries ? (
                <span className="font-medium text-(--color-text-primary)">
                  {entries.map((e) => e.name).join(' e ')}
                  <span className="text-(--color-text-secondary)"> — {entries[0].total_points} pts</span>
                </span>
              ) : (
                <span className="text-(--color-text-secondary) italic">não definido</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
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
  const { data, isLoading } = useRanking({ stages: activeTabDef.stages, mode: activeTabDef.mode })

  const ranking = data?.ranking ?? []
  const phaseStatus = data?.phase_status ?? null
  const badgeMap = data?.badge_map
  const championsData = data?.champions
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
                Campeão {activeTabDef.phaseOf}:
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
              Líder parcial {activeTabDef.phaseOf}:{' '}
              <span className="font-medium text-(--color-text-primary)">{leader.name}</span>
              {' '}— {leader.total_points} pts
            </p>
          </div>
        )}

        {/* Mural de conquistas — só na aba Geral */}
        {!isPhaseFilter && !isLoading && (
          <MuralCard champions={championsData} />
        )}

        {/* Banner de zeros para aba Geral */}
        {!isPhaseFilter && allZero && (
          <div className="bg-(--color-bg-surface) rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-(--color-text-secondary)">
              {activeTabDef.emptyText}
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
              {activeTabDef.emptyText}
            </p>
            <div className="space-y-2">
              {[...ranking]
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .map((entry) => {
                  const isMe = entry.telegram_id === me?.telegram_id
                  const badges = badgeMap ? badgeMap[entry.user_id] : undefined
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
                        <BadgeIcons badges={badges} />
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
              const badges = badgeMap ? badgeMap[entry.user_id] : undefined

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
                    <BadgeIcons badges={badges} />
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
