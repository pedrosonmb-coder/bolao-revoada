'use client'

import { useState } from 'react'
import { adminFetch } from '@/lib/api/admin'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatKickoff } from '@/lib/format'

type SystemStatus = {
  database: { connected: boolean; users_count: number; matches_count: number; predictions_count: number }
  crons: Record<string, { last_run: number | null; last_error: string | null }>
  notifications: { sent_today: number }
  external_apis: { football_data: { last_success_at: number | null; status: string } }
}

type Props = {
  status: SystemStatus | null
  telegramId: number
  onRefresh: () => void
}

const CRON_LABELS: Record<string, string> = {
  'poll-fixtures': 'Poll fixtures',
  'poll-live-matches': 'Poll live matches',
  morning_digest: 'Morning digest',
  evening_summary: 'Evening summary',
  'post-match-summary': 'Post-match summary',
  'pre-match-reminder': 'Pre-match reminder',
  'weekly-recap': 'Weekly recap',
  admin_override: 'Override manual',
  admin_cancel: 'W.O. manual',
}

function formatTs(ts: number | null): string {
  if (!ts) return 'Nunca'
  return formatKickoff(ts)
}

export function SystemTab({ status, telegramId, onRefresh }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function doRecalculateAll() {
    if (!confirm('Recalcular TODOS os palpites? Pode demorar.')) return
    setLoading(true)
    try {
      const res = await adminFetch<{ matches_processed: number; predictions_updated: number }>(
        '/api/admin/recalculate',
        telegramId,
        { method: 'POST', body: JSON.stringify({}), confirm: true }
      )
      toast(`Recalculado: ${res.matches_processed} jogos, ${res.predictions_updated} palpites`)
      onRefresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function doPollFixtures() {
    setLoading(true)
    try {
      const res = await adminFetch<{ checked: number; updated: number; duration_ms: number }>(
        '/api/cron/poll-fixtures',
        telegramId,
        { method: 'GET' }
      )
      toast(`Poll fixtures: ${res.checked} checados, ${res.updated} atualizados (${res.duration_ms}ms)`)
      onRefresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!status) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Banco */}
      <div className="bg-(--color-bg-surface) rounded-xl px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wider">Banco de dados</p>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${status.database.connected ? 'bg-(--color-status-success)' : 'bg-(--color-status-danger)'}`} />
          <span className="text-sm text-(--color-text-primary)">
            {status.database.connected ? 'Conectado' : 'Erro'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ['Usuários', status.database.users_count],
            ['Jogos', status.database.matches_count],
            ['Palpites', status.database.predictions_count],
          ].map(([label, count]) => (
            <div key={label} className="bg-(--color-bg-base) rounded-lg py-2">
              <p className="font-[family-name:var(--font-tight)] font-black text-xl text-(--color-text-primary)">{count}</p>
              <p className="text-xs text-(--color-text-secondary)">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Notificações */}
      <div className="bg-(--color-bg-surface) rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wider mb-2">Notificações hoje</p>
        <p className="font-[family-name:var(--font-tight)] font-black text-2xl text-(--color-text-primary)">
          {status.notifications.sent_today}
        </p>
      </div>

      {/* API externa */}
      <div className="bg-(--color-bg-surface) rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wider mb-2">Football-data.org</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-(--color-text-secondary)">Último sync</span>
          <span className="text-sm text-(--color-text-primary)">{formatTs(status.external_apis.football_data.last_success_at)}</span>
        </div>
      </div>

      {/* Crons */}
      <div className="bg-(--color-bg-surface) rounded-xl px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wider">Crons</p>
        {Object.entries(status.crons).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-(--color-text-secondary) truncate mr-2">{CRON_LABELS[key] ?? key}</span>
            <div className="text-right shrink-0">
              <p className="text-(--color-text-primary) text-xs">{formatTs(val.last_run)}</p>
              {val.last_error && (
                <p className="text-(--color-accent-critical) text-xs truncate max-w-32">{val.last_error}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Ações */}
      <div className="space-y-2">
        <Button variant="secondary" size="lg" disabled={loading} onClick={doRecalculateAll} className="w-full">
          Recalcular tudo
        </Button>
        <Button variant="secondary" size="lg" disabled={loading} onClick={doPollFixtures} className="w-full">
          Recarregar fixtures agora
        </Button>
      </div>
    </div>
  )
}
