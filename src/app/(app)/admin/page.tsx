'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/components/providers/telegram-provider'
import { BackButton } from '@/components/layout/back-button'
import { AdminTabs } from '@/components/admin/admin-tabs'

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
      <div className="px-4 py-6 space-y-3 max-w-2xl mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-(--color-bg-surface) rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!user?.is_admin) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <BackButton fallbackHref="/mais" />
      <h1 className="font-[family-name:var(--font-tight)] font-black text-xl uppercase mb-6">
        Painel admin
      </h1>
      <AdminTabs telegramId={user.telegram_id} />
    </div>
  )
}
