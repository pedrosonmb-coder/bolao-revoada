'use client'

import { useTelegram } from '@/components/providers/telegram-provider'
import { BackButton } from '@/components/layout/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateOnly } from '@/lib/format'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-(--color-border-base) last:border-0">
      <span className="text-sm text-(--color-text-secondary)">{label}</span>
      <span className="text-sm font-medium text-(--color-text-primary) text-right max-w-[55%] break-words">
        {value}
      </span>
    </div>
  )
}

export default function ContaPage() {
  const { user, isLoading } = useTelegram()

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <BackButton fallbackHref="/mais" />
      <h1 className="font-[family-name:var(--font-tight)] font-black text-xl uppercase mb-6">
        Minha conta
      </h1>

      <div className="bg-(--color-bg-surface) rounded-xl px-4">
        <Row label="Nome" value={`${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`} />
        <Row label="ID Telegram" value={String(user.telegram_id)} />
        <Row label="Status" value={user.is_active ? 'Ativo' : 'Inativo'} />
        <Row label="Pagamento" value={user.paid_at ? `Confirmado em ${formatDateOnly(user.paid_at)}` : 'Pendente'} />
        {user.is_admin && <Row label="Perfil" value="Administrador" />}
      </div>

      <p className="text-xs text-(--color-text-secondary) mt-4">
        Dados sincronizados com o Telegram. Não é possível editar por aqui.
      </p>
    </div>
  )
}
