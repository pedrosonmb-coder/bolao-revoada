'use client'

import { ArrowLeft } from 'lucide-react'

export function BackButton({ fallbackHref = '/' }: { fallbackHref?: string }) {
  function handleBack() {
    const tg = window.Telegram?.WebApp
    if (tg && typeof tg.close === 'function' && tg.initData && tg.initData.length > 0) {
      tg.close()
      return
    }
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = fallbackHref
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 text-sm text-(--color-text-secondary) hover:text-(--color-text-primary) py-1 mb-4 transition-colors"
    >
      <ArrowLeft size={16} />
      Voltar
    </button>
  )
}
