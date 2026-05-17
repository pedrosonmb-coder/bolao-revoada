'use client'

import { useTelegram } from '@/components/providers/telegram-provider'
import { BackButton } from '@/components/layout/back-button'

function formatDate(d: Date | null | undefined): string {
  if (!d) return 'Pendente'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(d))
}

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
          <div key={i} className="h-10 bg-(--color-bg-surface) rounded animate-pulse" />
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
        <Row label="Pagamento" value={user.paid_at ? `Confirmado em ${formatDate(user.paid_at)}` : 'Pendente'} />
        {user.is_admin && <Row label="Perfil" value="Administrador" />}
      </div>

      <p className="text-xs text-(--color-text-secondary) mt-4">
        Dados sincronizados com o Telegram. Não é possível editar por aqui.
      </p>
    </div>
  )
}
