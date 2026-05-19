'use client'

import { useState, useEffect, useRef } from 'react'

type PendingItem = { fn: () => Promise<unknown> }

const pendingQueue: PendingItem[] = []

export function queueWhenOffline(fn: () => Promise<unknown>) {
  if (navigator.onLine) {
    fn()
  } else {
    pendingQueue.push({ fn })
  }
}

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)

    function handleOffline() {
      setIsOffline(true)
    }

    async function handleOnline() {
      setIsOffline(false)
      // Drena a fila de salvamentos pendentes
      const items = pendingQueue.splice(0)
      for (const item of items) {
        await item.fn().catch(() => {})
      }
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed top-12 left-0 right-0 z-toast bg-(--color-accent-critical) text-white text-center text-xs py-2 px-4">
      Sem conexão. Salvamentos vão tentar quando voltar online.
    </div>
  )
}
