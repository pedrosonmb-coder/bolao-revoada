'use client'

import { usePremio } from '@/hooks/use-premio'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const PRIZE_TIERS = [
  { emoji: '🥇', label: '1º LUGAR', pct: '70%', key: 'first' as const },
  { emoji: '🥈', label: '2º LUGAR', pct: '20%', key: 'second' as const },
  { emoji: '🥉', label: '3º LUGAR', pct: '10%', key: 'third' as const },
]

export default function PremioPage() {
  const { data, isLoading } = usePremio()

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  if (!data || (data.paid_count === 0 && data.total_count === 0)) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <EmptyState title="Aguardando participantes" description="O prêmio será calculado quando os participantes confirmarem pagamento." />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
      <h1 className="font-[family-name:var(--font-tight)] font-black text-2xl uppercase tracking-wide text-(--color-text-primary)">
        Prêmio
      </h1>

      {/* Card total arrecadado */}
      <Card variant="elevated" className="text-center">
        <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wider mb-2">
          Total arrecadado
        </p>
        <p className="font-[family-name:var(--font-tight)] font-black text-4xl text-(--color-text-primary) mb-1">
          {formatBRL(data.total_amount)}
        </p>
        <p className="text-sm text-(--color-text-secondary)">
          {data.paid_count} de {data.total_count} participantes confirmados
        </p>
      </Card>

      {/* Grid de prêmios */}
      <div className="grid grid-cols-3 gap-3">
        {PRIZE_TIERS.map(({ emoji, label, pct, key }) => (
          <Card key={key} variant="default" className="text-center !p-3">
            <p className="text-lg mb-1">{emoji}</p>
            <p className="text-[10px] font-semibold text-(--color-text-secondary) uppercase tracking-wide mb-0.5">
              {label}
            </p>
            <p className="text-xs text-(--color-text-secondary) mb-1">{pct}</p>
            <p className="font-[family-name:var(--font-tight)] font-bold text-base text-(--color-text-primary)">
              {formatBRL(data.prizes[key])}
            </p>
          </Card>
        ))}
      </div>

      {/* Participantes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-[family-name:var(--font-tight)] font-bold text-xs uppercase tracking-wider text-(--color-text-secondary)">
            Participantes
          </h2>
          <span className="text-xs text-(--color-text-secondary)">
            {data.paid_count} pagos · {data.total_count - data.paid_count} pendentes
          </span>
        </div>

        <Card variant="flat" className="!p-0 overflow-hidden">
          <div className="divide-y divide-(--color-border-base)">
            {data.participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-(--color-bg-base) border border-(--color-border-base) flex items-center justify-center text-sm font-bold text-(--color-text-primary) shrink-0">
                  {p.name[0]}
                </div>
                <span className="flex-1 text-sm font-medium text-(--color-text-primary)">
                  {p.name}
                </span>
                <Badge variant={p.is_paid ? 'success' : 'warning'}>
                  {p.is_paid ? 'Pago' : 'Pendente'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
