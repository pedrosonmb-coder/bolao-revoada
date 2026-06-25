'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminFetch } from '@/lib/api/admin'
import { apiFetch } from '@/lib/api/client'
import { UsersTab } from './users-tab'
import { MatchesTab } from './matches-tab'
import { SystemTab } from './system-tab'
import { TournamentTab } from './tournament-tab'
import { Skeleton } from '@/components/ui/skeleton'
import type { Match } from '@/lib/db/schema'

type Tab = 'users' | 'matches' | 'system' | 'tournament'

type AdminUser = {
  user_id: number
  telegram_id: number
  first_name: string
  last_name: string | null
  display_name: string | null
  is_admin: boolean
  is_active: boolean
  paid_at: string | number | null
  position: number | null
  total_points: number
  predictions_count: number
  has_tournament_pred: boolean
}

type SystemStatus = {
  database: { connected: boolean; users_count: number; matches_count: number; predictions_count: number }
  crons: Record<string, { last_run: number | null; last_error: string | null }>
  notifications: { sent_today: number }
  external_apis: { football_data: { last_success_at: number | null; status: string } }
}

export function AdminTabs({ telegramId }: { telegramId: number }) {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, matchesRes, statusRes] = await Promise.allSettled([
        adminFetch<{ users: AdminUser[] }>('/api/admin/users', telegramId),
        apiFetch<{ matches: Match[] }>('/api/matches'),
        adminFetch<SystemStatus>('/api/admin/system-status', telegramId),
      ])

      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.users)
      if (matchesRes.status === 'fulfilled') setMatches(matchesRes.value.matches)
      if (statusRes.status === 'fulfilled') setSystemStatus(statusRes.value)
    } finally {
      setLoading(false)
    }
  }, [telegramId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'users', label: 'Usuários' },
    { id: 'matches', label: 'Jogos' },
    { id: 'system', label: 'Sistema' },
    { id: 'tournament', label: 'Torneio' },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-(--color-bg-surface) rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-(--color-accent-primary) text-white'
                : 'text-(--color-text-secondary)'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {tab === 'users' && (
            <UsersTab users={users} telegramId={telegramId} onRefresh={loadAll} />
          )}
          {tab === 'matches' && (
            <MatchesTab matches={matches} telegramId={telegramId} onRefresh={loadAll} />
          )}
          {tab === 'system' && (
            <SystemTab status={systemStatus} telegramId={telegramId} onRefresh={loadAll} />
          )}
          {tab === 'tournament' && (
            <TournamentTab telegramId={telegramId} />
          )}
        </>
      )}
    </div>
  )
}
