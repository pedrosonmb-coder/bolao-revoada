'use client'

import { useState } from 'react'
import { adminFetch } from '@/lib/api/admin'
import { useToast } from '@/components/ui/toast'

type AdminUser = {
  user_id: number
  telegram_id: number
  first_name: string
  last_name: string | null
  is_admin: boolean
  is_active: boolean
  paid_at: string | number | null
  position: number | null
  total_points: number
  predictions_count: number
  has_tournament_pred: boolean
}

type Props = {
  users: AdminUser[]
  telegramId: number
  onRefresh: () => void
}

function formatPaidAt(paid_at: string | number | null): string {
  if (!paid_at) return 'Pendente'
  const d = typeof paid_at === 'number' ? new Date(paid_at * 1000) : new Date(paid_at)
  return d.toLocaleDateString('pt-BR')
}

export function UsersTab({ users, telegramId, onRefresh }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState<Record<number, boolean>>({})

  const active = users.filter((u) => u.is_active)
  const paid = users.filter((u) => u.paid_at)
  const pending = users.filter((u) => !u.paid_at && u.is_active)

  async function patch(userId: number, data: Record<string, unknown>) {
    setLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      await adminFetch(`/api/admin/users/${userId}`, telegramId, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      toast('Atualizado')
      onRefresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'error')
    } finally {
      setLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 text-xs text-(--color-text-secondary)">
        <span>{active.length} ativos</span>
        <span>·</span>
        <span>{paid.length} pagos</span>
        <span>·</span>
        <span>{pending.length} pendentes</span>
      </div>

      <div className="space-y-2">
        {users.map((u) => {
          const isPaid = !!u.paid_at
          const isLoading = loading[u.user_id]

          return (
            <div
              key={u.user_id}
              className="bg-(--color-bg-surface) rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-(--color-bg-base) flex items-center justify-center text-sm font-bold text-(--color-text-primary) shrink-0">
                {u.first_name[0]}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-(--color-text-primary) truncate">
                  {u.first_name} {u.last_name}
                  {u.is_admin && (
                    <span className="ml-1 text-xs text-(--color-text-secondary)">(admin)</span>
                  )}
                </p>
                <p className="text-xs text-(--color-text-secondary)">
                  {u.position ? `#${u.position} · ` : ''}{u.total_points} pts · {u.predictions_count} palpites
                  {u.has_tournament_pred ? ' · torneio ✓' : ''}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isPaid
                      ? 'bg-(--color-accent-primary)/20 text-(--color-accent-primary)'
                      : 'bg-(--color-accent-critical)/20 text-(--color-accent-critical)'
                  }`}
                >
                  {isPaid ? `Pago ${formatPaidAt(u.paid_at)}` : 'Pendente'}
                </span>

                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() =>
                      patch(u.user_id, {
                        paid_at: isPaid ? null : Math.floor(Date.now() / 1000),
                      })
                    }
                    className="text-xs px-2 py-0.5 rounded bg-(--color-bg-base) text-(--color-text-secondary) disabled:opacity-50"
                  >
                    {isPaid ? 'Desmarcar' : 'Marcar pago'}
                  </button>

                  {!u.is_admin && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => patch(u.user_id, { is_active: !u.is_active })}
                      className="text-xs px-2 py-0.5 rounded bg-(--color-bg-base) text-(--color-text-secondary) disabled:opacity-50"
                    >
                      {u.is_active ? 'Desativar' : 'Reativar'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
