'use client'

import { useState } from 'react'
import { useTelegram } from '@/components/providers/telegram-provider'
import { useRanking } from '@/hooks/use-ranking'
import { UserDetailDrawer } from './user-detail-drawer'

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
            <div key={i} className="h-14 bg-(--color-bg-surface) rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {ranking.map((entry) => {
            const isMe = entry.telegram_id === me?.telegram_id
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
                <span
                  className={`font-[family-name:var(--font-tight)] font-black text-lg w-6 text-center ${
                    isMe ? 'text-white' : 'text-(--color-text-secondary)'
                  }`}
                >
                  {entry.position}
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
