'use client'

import { useState } from 'react'
import { useTelegram } from '@/components/providers/telegram-provider'
import { useRanking } from '@/hooks/use-ranking'
import { UserDetailDrawer } from './user-detail-drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'

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
  const delta = prev - current // positivo = subiu (posição menor = melhor)
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
  const { data, isLoading } = useRanking()
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const ranking = data?.ranking ?? []
  const allZero = ranking.every((e) => e.total_points === 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {allZero && (
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
                    alt={entry.first_name}
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
                    {entry.first_name[0]}
                  </div>
                )}

                <span
                  className={`flex-1 text-sm font-medium ${
                    isMe ? 'text-white' : 'text-(--color-text-primary)'
                  }`}
                >
                  {entry.first_name} {entry.last_name}
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

      <UserDetailDrawer
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  )
}
