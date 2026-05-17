'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/components/providers/telegram-provider'
import { BackButton } from '@/components/layout/back-button'

const FEATURES = [
  'Forçar resultado manual de um jogo',
  'Recalcular pontuação de todos os participantes',
  'Marcar pagamento de inscrição de um usuário',
  'Bloquear/desbloquear participante',
  'Fechar janela de palpites manualmente',
  'Visualizar todos os palpites de torneio',
]

export default function AdminPage() {
  const { user, isLoading } = useTelegram()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && !user.is_admin) {
      router.replace('/')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 bg-(--color-bg-surface) rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (!user?.is_admin) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <BackButton fallbackHref="/mais" />
      <h1 className="font-[family-name:var(--font-tight)] font-black text-xl uppercase mb-2">
        Painel admin
      </h1>
      <p className="text-(--color-text-secondary) text-sm mb-6">
        Em construção. Será implementado na Fase 7.
      </p>

      <div className="bg-(--color-bg-surface) rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wider mb-3">
          O que vai ter
        </p>
        <ul className="space-y-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-(--color-text-primary)">
              <span className="text-(--color-text-secondary) mt-0.5">—</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
