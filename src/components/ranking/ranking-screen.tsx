'use client'

import useSWR from 'swr'
import { swrFetcher } from '@/lib/api/client'
import { useTelegram } from '@/components/providers/telegram-provider'
import type { User } from '@/lib/db/schema'

type UsersResponse = { users: Pick<User, 'id' | 'first_name' | 'last_name' | 'photo_url' | 'telegram_id'>[] }

export function RankingScreen() {
  const { user: me } = useTelegram()
  const { data, isLoading } = useSWR<UsersResponse>('/api/users', swrFetcher)

  const sorted = [...(data?.users ?? [])].sort((a, b) =>
    `${a.first_name} ${a.last_name ?? ''}`.localeCompare(`${b.first_name} ${b.last_name ?? ''}`, 'pt-BR')
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="bg-(--color-bg-surface) rounded-xl p-4 mb-6 text-center">
        <p className="text-sm text-(--color-text-secondary)">
          Pontuação será calculada quando a Copa começar. Por enquanto, todos com 0 pontos.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-(--color-bg-surface) rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((u, i) => {
            const isMe = u.telegram_id === me?.telegram_id
            return (
              <div
                key={u.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  isMe
                    ? 'bg-(--color-accent-primary) text-white'
                    : 'bg-(--color-bg-surface)'
                }`}
              >
                <span
                  className={`font-[family-name:var(--font-tight)] font-black text-lg w-6 text-center ${
                    isMe ? 'text-white' : 'text-(--color-text-secondary)'
                  }`}
                >
                  {i + 1}
                </span>

                {u.photo_url ? (
                  <img
                    src={u.photo_url}
                    alt={u.first_name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                      isMe ? 'bg-white/20 text-white' : 'bg-(--color-bg-surface) text-(--color-text-primary)'
                    }`}
                  >
                    {u.first_name[0]}
                  </div>
                )}

                <span
                  className={`flex-1 text-sm font-medium ${
                    isMe ? 'text-white' : 'text-(--color-text-primary)'
                  }`}
                >
                  {u.first_name} {u.last_name}
                </span>

                <span
                  className={`font-[family-name:var(--font-tight)] font-bold text-sm ${
                    isMe ? 'text-white' : 'text-(--color-text-primary)'
                  }`}
                >
                  0 pts
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
