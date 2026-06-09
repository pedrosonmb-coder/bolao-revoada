'use client'

import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { adminFetch } from '@/lib/api/admin'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateOnly } from '@/lib/format'
import { getDisplayName } from '@/lib/display-name'

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

type Props = {
  users: AdminUser[]
  telegramId: number
  onRefresh: () => void
}

export function UsersTab({ users, telegramId, onRefresh }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState<Record<number, boolean>>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

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

  function startEdit(u: AdminUser) {
    setEditingId(u.user_id)
    setEditValue(u.display_name ?? '')
  }

  async function saveEdit(userId: number) {
    await patch(userId, { display_name: editValue.trim() || null })
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
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
          const isEditing = editingId === u.user_id
          const displayedName = getDisplayName(u)

          return (
            <div
              key={u.user_id}
              className="bg-(--color-bg-surface) rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-(--color-bg-base) flex items-center justify-center text-sm font-bold text-(--color-text-primary) shrink-0">
                {displayedName[0]}
              </div>

              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      className="flex-1 text-sm bg-(--color-bg-base) border border-(--color-accent-primary) rounded px-2 py-0.5 text-(--color-text-primary) outline-none"
                      value={editValue}
                      placeholder={`${u.first_name}${u.last_name ? ' ' + u.last_name : ''}`}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(u.user_id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(u.user_id)}
                      className="text-(--color-status-success) hover:opacity-70"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-(--color-text-secondary) hover:opacity-70"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-sm font-medium text-(--color-text-primary) truncate">
                      {displayedName}
                      {u.display_name && (
                        <span className="ml-1 text-xs text-(--color-text-secondary) font-normal">
                          ({u.first_name})
                        </span>
                      )}
                      {u.is_admin && (
                        <span className="ml-1 text-xs text-(--color-text-secondary)">(admin)</span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => startEdit(u)}
                      className="shrink-0 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
                      title="Editar nome de exibição"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
                <p className="text-xs text-(--color-text-secondary) mt-0.5">
                  {u.position ? `#${u.position} · ` : ''}{u.total_points} pts · {u.predictions_count} palpites
                  {u.has_tournament_pred ? ' · torneio ✓' : ''}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Badge variant={isPaid ? 'success' : 'warning'}>
                  {isPaid ? `Pago ${formatDateOnly(u.paid_at)}` : 'Pendente'}
                </Badge>

                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => patch(u.user_id, { paid_at: isPaid ? null : Math.floor(Date.now() / 1000) })}
                  >
                    {isPaid ? 'Desmarcar' : 'Marcar pago'}
                  </Button>

                  {!u.is_admin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => patch(u.user_id, { is_active: !u.is_active })}
                    >
                      {u.is_active ? 'Desativar' : 'Reativar'}
                    </Button>
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
